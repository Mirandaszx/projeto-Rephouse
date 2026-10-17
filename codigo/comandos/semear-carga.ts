import {createDatabase} from '../infraestrutura/banco/client.js'
import {prepareLoad,loadIntegrity} from '../infraestrutura/banco/carga.js'
const db=createDatabase()
try{
  if(process.env.CARGA_ACAO==='verificar'){
    if(process.env.NODE_ENV!=='test'||new URL(process.env.DATABASE_URL!).pathname!=='/rabbu_mvp_carga')throw new Error('Banco de carga obrigatório.')
    console.log(JSON.stringify(await loadIntegrity(db)))
  }else console.log(JSON.stringify(await prepareLoad(db,process.env.CARGA_PERFIL??'curto',process.env.JWT_SECRET??'')))
}catch{console.error('Preparação/verificação de carga falhou; confira instância isolada, configuração e integridade.');process.exitCode=1}
finally{await db.$disconnect()}
