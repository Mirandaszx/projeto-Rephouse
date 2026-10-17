import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID,createHash} from 'node:crypto'
import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import pg from 'pg'
import {createDatabase} from '../codigo/infraestrutura/banco/client.js'
import {prepareReceipt} from '../codigo/infraestrutura/armazenamento/comprovantes.js'
import {importLegacyReceipts,receiptInventory} from '../codigo/infraestrutura/armazenamento/importar-comprovantes.js'
import {semearDemonstracao} from '../codigo/infraestrutura/banco/demonstracao.js'
import {registrarPagamento} from '../codigo/modulos/financeiro/financeiro.service.js'

const url=process.env.TEST_DATABASE_URL
test('comprovantes: atomicidade, constraints e importação de históricos',{skip:!url||new URL(url).pathname!=='/rabbu_mvp_test',timeout:90000},async t=>{
  assert.ok(url)
  const schema=`receipts_test_${randomUUID().replaceAll('-','')}`
  const setup=new pg.Client({connectionString:url,options:`-c search_path=${schema}`})
  await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`)
  const isolated=new URL(url);isolated.searchParams.set('schema',schema)
  const db=createDatabase(isolated.toString())
  const folder=await mkdtemp(join(tmpdir(),'rephouse-import-'))
  try{
    for(const migration of(await readdir('prisma/migracoes')).filter(name=>/^\d/.test(name)).sort())await setup.query(await readFile(`prisma/migracoes/${migration}/migration.sql`,'utf8'))
    await semearDemonstracao(db,'senha-exclusiva-fixture-comprovantes123')
    const share=await db.rateioDespesa.findFirstOrThrow({where:{valorPago:'0.00'},include:{membro:true}})
    const proof=await prepareReceipt(Buffer.from('%PDF-1.4\nfixture legada\n%%EOF'))
    const before=await db.pagamento.count()
    await t.test('falha ao inserir comprovante reverte pagamento e saldo sincronizado',async()=>{
      await assert.rejects(registrarPagamento(db,{rateioId:share.id,membroId:share.membroId,valor:'0.01',comprovante:{...proof,hashSha256:'0'.repeat(64)}}))
      assert.equal(await db.pagamento.count(),before);assert.equal(await db.comprovante.count(),0)
      assert.equal((await db.rateioDespesa.findUniqueOrThrow({where:{id:share.id}})).valorPago.toFixed(2),'0.00')
    })
    const payment=await registrarPagamento(db,{rateioId:share.id,membroId:share.membroId,valor:'0.01',comprovante:proof})
    await t.test('um comprovante por pagamento; bytes e histórico imutáveis no SQL',async()=>{
      await assert.rejects(db.comprovante.create({data:{pagamentoId:payment.id,...proof}}))
      await assert.rejects(db.comprovante.create({data:{pagamentoId:randomUUID(),...proof}}))
      await assert.rejects(db.comprovante.update({where:{pagamentoId:payment.id},data:{mimeType:'image/png'}}))
      await assert.rejects(db.comprovante.delete({where:{pagamentoId:payment.id}}))
      for(const invalid of [{...proof,tamanho:0},{...proof,tamanho:proof.tamanho+1},{...proof,mimeType:'text/plain'},{...proof,conteudo:new Uint8Array(5242881),tamanho:5242881}]){
        await assert.rejects(registrarPagamento(db,{rateioId:share.id,membroId:share.membroId,valor:'0.01',comprovante:invalid}))
      }
      assert.equal(await db.pagamento.count(),before+1)
    })
    await t.test('hash não impõe unicidade global e aceita exatamente 5 MiB',async()=>{
      await registrarPagamento(db,{rateioId:share.id,membroId:share.membroId,valor:'0.01',comprovante:proof})
      const large=Buffer.alloc(5242880);large.write('%PDF-1.4\n');large.write('\n%%EOF',large.length-6)
      await registrarPagamento(db,{rateioId:share.id,membroId:share.membroId,valor:'0.01',comprovante:await prepareReceipt(large)})
      assert.equal(await db.comprovante.count(),3)
    })
    const file=`${randomUUID()}.pdf`,key=randomUUID()
    const hash=createHash('sha256').update(JSON.stringify([share.membro.usuarioId,share.id,'0.01',proof.hashSha256])).digest('hex')
    const legacy=await registrarPagamento(db,{rateioId:share.id,membroId:share.membroId,valor:'0.01',comprovanteUrl:file,chaveIdempotencia:key,hashRequisicao:hash})
    const original=await db.pagamento.findUniqueOrThrow({where:{id:legacy.id}})
    await t.test('arquivo ausente ou divergente impede importação sem alterar o histórico',async()=>{
      await assert.rejects(importLegacyReceipts(db,folder,true),/Arquivo ausente/)
      await writeFile(join(folder,file),'%PDF-1.4\narquivo diferente\n%%EOF')
      await assert.rejects(importLegacyReceipts(db,folder,true),/Hash divergente/)
      assert.equal(await db.comprovante.count(),3)
    })
    await writeFile(join(folder,file),proof.conteudo)
    await t.test('conferência não grava; importação é reentrante e preserva originais',async()=>{
      assert.equal((await importLegacyReceipts(db,folder)).aImportar,1)
      assert.equal(await db.comprovante.count(),3)
      assert.equal((await importLegacyReceipts(db,folder,true)).importados,1)
      assert.equal((await importLegacyReceipts(db,folder,true)).importados,0)
      assert.deepEqual(await db.pagamento.findUniqueOrThrow({where:{id:legacy.id}}),original)
      assert.deepEqual(await readFile(join(folder,file)),Buffer.from(proof.conteudo))
      assert.equal((await receiptInventory(db)).referenciasLegadasPendentes,0)
    })
  }finally{
    await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()
    await rm(folder,{recursive:true}) // Diretório exclusivo criado acima por este teste.
  }
})
