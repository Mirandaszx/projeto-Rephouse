import 'dotenv/config'
import {createDatabase} from '../infraestrutura/banco/client.js'
import {importLegacyReceipts,LegacyReceiptError} from '../infraestrutura/armazenamento/importar-comprovantes.js'
import {AppError} from '../compartilhado/http/app-error.js'

const args=process.argv.slice(2)
if(args.length>2||!['conferir','aplicar'].includes(args[0]??''))throw new Error('Uso: comprovantes:importar -- conferir|aplicar [diretorio-legado]. Pare a API antes de aplicar.')
const db=createDatabase()
try{
  console.log(JSON.stringify(await importLegacyReceipts(db,args[1]??process.env.UPLOAD_DIR??'armazenamento/comprovantes',args[0]==='aplicar'),null,2))
}catch(error){console.error(error instanceof LegacyReceiptError||error instanceof AppError?error.message:'Importação falhou. Confira o banco e os arquivos; nenhum arquivo foi removido.');process.exitCode=1}
finally{await db.$disconnect()}
