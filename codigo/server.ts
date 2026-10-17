import { createApp } from './app.js'
import { loadEnv } from './configuracao/env.js'
import { createDatabase } from './infraestrutura/banco/client.js'
import { createReadinessProbe } from './modulos/saude/readiness.js'
import { stdoutLog } from './compartilhado/http/request-log.js'
import {receiptInventory} from './infraestrutura/armazenamento/importar-comprovantes.js'

async function startServer(): Promise<void> {
  const env = loadEnv()
  const database = createDatabase(env.DATABASE_URL)
  const probe = createReadinessProbe(env.DATABASE_URL)
  try {
    await database.$connect()
    const inventory=await receiptInventory(database)
    if(inventory.referenciasLegadasPendentes||inventory.invalidos)throw new Error('Conclua a importação e a conferência dos comprovantes antes de iniciar a API.')
    const server = createApp({ database, readiness: () => probe.check(), jwtSecret: env.JWT_SECRET, corsOrigins: env.CORS_ORIGINS }).listen(env.PORT, env.HOST, () => {
      stdoutLog({ event: 'started', port: env.PORT })
    })
    let encerrando = false
    server.headersTimeout=10000
    server.requestTimeout=30000
    server.keepAliveTimeout=5000

    const shutdown = (): void => {
      if (encerrando) return
      encerrando = true
      const limite = setTimeout(() => { process.exit(1) }, 15000)
      limite.unref()
      server.close(() => {
        void Promise.all([database.$disconnect(), probe.close()]).catch(() => {
          process.exitCode = 1
        }).finally(() => {
          clearTimeout(limite)
        })
      })
    }

    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
    server.once('error', () => {
      stdoutLog({ event: 'listen_failed' })
      process.exitCode = 1
      shutdown()
    })
  } catch (error: unknown) {
    await database.$disconnect()
    await probe.close()
    throw error
  }
}

void startServer().catch(() => {
  stdoutLog({ event: 'startup_failed' })
  process.exitCode = 1
})
