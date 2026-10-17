import { createApp } from './app.js'
import { loadEnv } from './configuracao/env.js'
import { createDatabase } from './infraestrutura/banco/client.js'

async function startServer(): Promise<void> {
  const env = loadEnv()
  const database = createDatabase(env.DATABASE_URL)
  try {
    await database.$connect()
    const server = createApp({ database, jwtSecret: env.JWT_SECRET, uploadDirectory: env.UPLOAD_DIR }).listen(env.PORT, env.HOST, () => {
      console.log(`API disponível na porta ${env.PORT}`)
    })
    let encerrando = false

    const shutdown = (): void => {
      if (encerrando) return
      encerrando = true
      const limite = setTimeout(() => { process.exit(1) }, 10000)
      limite.unref()
      server.close(() => {
        void database.$disconnect().catch(() => {
          process.exitCode = 1
        }).finally(() => {
          clearTimeout(limite)
        })
      })
    }

    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
    server.once('error', () => {
      console.error('Não foi possível abrir a porta da API.')
      process.exitCode = 1
      shutdown()
    })
  } catch (error: unknown) {
    await database.$disconnect()
    throw error
  }
}

void startServer().catch(() => {
  console.error('Não foi possível iniciar a API. Confira as variáveis de ambiente e a conexão ao banco.')
  process.exitCode = 1
})
