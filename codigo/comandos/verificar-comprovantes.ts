import 'dotenv/config'
import {readdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createDatabase} from '../infraestrutura/banco/client.js'

const db=createDatabase()
try{
  const root=resolve(process.env.UPLOAD_DIR??'armazenamento/comprovantes')
  const rows=await db.pagamento.findMany({where:{comprovanteUrl:{not:null}},select:{id:true,comprovanteUrl:true}})
  const entries=await readdir(root,{withFileTypes:true}).catch(error=>{
    if(error&&typeof error==='object'&&'code'in error&&error.code==='ENOENT')return []
    throw error
  })
  const files=new Set(entries.filter(file=>file.isFile()).map(file=>file.name))
  const references=new Set(rows.map(row=>row.comprovanteUrl!))
  const missing=rows.filter(row=>!files.has(row.comprovanteUrl!)).map(row=>row.id)
  const orphans=[...files].filter(file=>!references.has(file))
  console.log(JSON.stringify({referencias:rows.length,arquivos:files.size,pagamentosComArquivoAusente:missing,arquivosSemReferencia:orphans,linksIgnorados:entries.filter(file=>file.isSymbolicLink()).length},null,2))
  if(missing.length)process.exitCode=1
}catch{console.error('Não foi possível conferir os comprovantes. Confira banco, diretório e permissões.');process.exitCode=1}
finally{await db.$disconnect()}
