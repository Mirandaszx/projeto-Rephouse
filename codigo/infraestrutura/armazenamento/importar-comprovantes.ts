import {createHash} from 'node:crypto'
import {lstat,readFile,readdir,realpath} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import type {PrismaClient} from '../../gerado/prisma/client.js'
import {executarTransacaoAcid} from '../banco/transaction.js'
import {prepareReceipt} from './comprovantes.js'

export class LegacyReceiptError extends Error {}

export async function receiptInventory(db:PrismaClient){
  const [row]=await db.$queryRaw<{referenciasLegadasPendentes:number;comprovantes:number;invalidos:number}[]>`
    SELECT (SELECT count(*)::int FROM pagamentos p WHERE comprovante_url IS NOT NULL AND NOT EXISTS(SELECT 1 FROM comprovantes c WHERE c.pagamento_id=p.id)) AS "referenciasLegadasPendentes",
    (SELECT count(*)::int FROM comprovantes) AS comprovantes,
    (SELECT count(*)::int FROM comprovantes WHERE tamanho<>octet_length(conteudo) OR tamanho NOT BETWEEN 1 AND 5242880 OR hash_sha256<>encode(sha256(conteudo),'hex') OR mime_type NOT IN ('application/pdf','image/png','image/jpeg','image/webp')) AS invalidos`
  if(!row)throw new Error('Inventário indisponível.')
  return row
}

export async function importLegacyReceipts(db:PrismaClient,directory:string,apply=false){
  const rows=await db.pagamento.findMany({where:{comprovanteUrl:{not:null}},include:{membro:{select:{usuarioId:true}},comprovante:{select:{pagamentoId:true,hashSha256:true,tamanho:true,mimeType:true}}},orderBy:{id:'asc'}})
  const pending: {id:string;name:string;hash:string}[]=[]
  let existing=0
  const referenced=new Set(rows.map(row=>row.comprovanteUrl!))
  const root=rows.length?await realpath(directory):resolve(directory)
  // Valida todo o conjunto antes da primeira gravação. Nunca altera o pagamento histórico.
  for(const row of rows){
    const name=row.comprovanteUrl!
    if(!/^[a-f0-9-]{36}\.(pdf|png|jpg|webp)$/.test(name))throw new LegacyReceiptError(`Referência legada inválida no pagamento ${row.id}.`)
    const path=resolve(root,name)
    const stat=await lstat(path).catch(()=>{throw new LegacyReceiptError(`Arquivo ausente no pagamento ${row.id}.`)})
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>5242880||dirname(await realpath(path))!==root)throw new LegacyReceiptError(`Arquivo inválido no pagamento ${row.id}.`)
    const receipt=await prepareReceipt(await readFile(path))
    const expected=createHash('sha256').update(JSON.stringify([row.membro.usuarioId,row.rateioId,row.valor.toFixed(2),receipt.hashSha256])).digest('hex')
    if(row.hashRequisicao&&row.hashRequisicao!==expected)throw new LegacyReceiptError(`Hash divergente no pagamento ${row.id}.`)
    if(row.comprovante){
      if(row.comprovante.hashSha256!==receipt.hashSha256||row.comprovante.tamanho!==receipt.tamanho||row.comprovante.mimeType!==receipt.mimeType)throw new LegacyReceiptError(`Importação divergente no pagamento ${row.id}.`)
      existing++
    }else pending.push({id:row.id,name,hash:receipt.hashSha256})
  }
  if(apply)for(const item of pending){
    // Um buffer por vez: a memória não cresce com a soma de todos os arquivos.
    const receipt=await prepareReceipt(await readFile(resolve(root,item.name)))
    if(receipt.hashSha256!==item.hash)throw new Error('Arquivo mudou durante a importação.')
    await executarTransacaoAcid(db,async tx=>{
      const previous=await tx.comprovante.findUnique({where:{pagamentoId:item.id},select:{hashSha256:true}})
      if(previous){if(previous.hashSha256!==receipt.hashSha256)throw new Error('Importação concorrente divergente.');return}
      await tx.comprovante.create({data:{pagamentoId:item.id,...receipt}})
    })
  }
  const files=await readdir(root,{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return [];throw error})
  return {modo:apply?'aplicar':'conferir',referencias:rows.length,jaImportados:existing,aImportar:pending.length,importados:apply?pending.length:0,arquivosSemReferencia:files.filter(file=>file.isFile()&&!referenced.has(file.name)).map(file=>file.name),inventario:await receiptInventory(db)}
}
