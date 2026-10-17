import 'dotenv/config'
import {once} from 'node:events'
import {createApp} from '../../codigo/app.js'
import {abrirAmbienteIntegracao} from './ambiente.js'

const environment=await abrirAmbienteIntegracao(process.env.TEST_DATABASE_URL,process.env.DEMO_PASSWORD??'')
const server=createApp({database:environment.db,jwtSecret:'segredo-exclusivo-da-demonstracao-local-sem-dados-reais',corsOrigins:['http://localhost:5173','http://127.0.0.1:5173']})
  .listen(3402,'127.0.0.1')
try{
  await once(server,'listening')
  console.log(`Demonstração em http://127.0.0.1:3402; schema exclusivo: ${environment.schema}. Importe integracao/insomnia-jornadas.json e siga documentacao/JORNADAS_INTEGRACAO.md. Use apenas contas fictícias. Ctrl+C encerra e remove somente o schema desta sessão.`)
  await new Promise<void>(resolve=>{
    const finish=()=>{process.removeListener('SIGINT',finish);process.removeListener('SIGTERM',finish);resolve()}
    process.once('SIGINT',finish);process.once('SIGTERM',finish)
  })
}finally{
  server.closeAllConnections()
  await new Promise<void>(resolve=>server.close(()=>resolve()))
  await environment.close()
}
