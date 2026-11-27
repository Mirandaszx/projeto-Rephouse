import { createApp } from './app.js'
import { loadEnv } from './configuracao/env.js'
import { createDatabase } from './infraestrutura/banco/client.js'
import { createReadinessProbe } from './modulos/saude/readiness.js'
import { stdoutLog } from './compartilhado/http/request-log.js'
import {receiptInventory} from './infraestrutura/armazenamento/importar-comprovantes.js'
import { startRecurringScheduler } from './modulos/financeiro/recorrencias.service.js'
import { createResendSender } from './infraestrutura/email/resend.js'
import { createBrevoSender } from './infraestrutura/email/brevo.js'
import { startNotificationsScheduler } from './modulos/notificacoes/notificacoes.service.js'
import { createNotificationsSignal } from './modulos/notificacoes/notificacoes.stream.js'
import { startSaturationSampler } from './modulos/saude/saturacao.js'
import { startPrivacyCleanup } from './modulos/privacidade/limpeza.js'

async function startServer(): Promise<void> {
  const env = loadEnv()
  const database = createDatabase(env.DATABASE_URL)
  const probe = createReadinessProbe(env.DATABASE_URL)
  try {
    await database.$connect()
    const inventory=await receiptInventory(database)
    if(inventory.referenciasLegadasPendentes||inventory.invalidos)throw new Error('Conclua a importação e a conferência dos comprovantes antes de iniciar a API.')
    const signal = createNotificationsSignal(env.DATABASE_URL, stdoutLog)
    const app = createApp({ database, readiness: () => probe.check(), jwtSecret: env.JWT_SECRET, corsOrigins: env.CORS_ORIGINS, notificationsSignal: signal, trustProxy: env.TRUST_PROXY, privacyContact: env.PRIVACY_CONTACT_EMAIL ?? env.EMAIL_FROM, interfaceDir: env.INTERFACE_DIR,
      google: env.GOOGLE_CLIENT_ID ? { clientId: env.GOOGLE_CLIENT_ID, secureCookies: env.NODE_ENV === 'production' } : undefined,
      email: env.BREVO_API_KEY || env.RESEND_API_KEY ? {
        send: env.BREVO_API_KEY ? createBrevoSender(env.BREVO_API_KEY, env.EMAIL_FROM!) : createResendSender(env.RESEND_API_KEY!, env.EMAIL_FROM!),
        publicUrl: env.APP_PUBLIC_URL!, secureCookies: env.NODE_ENV === 'production',
      } : undefined,
    })
    const server = app.listen(env.PORT, env.HOST, () => {
      stdoutLog({ event: 'started', port: env.PORT })
    })
    let encerrando = false
    const stopRecurring = startRecurringScheduler(database, stdoutLog)
    const stopNotifications = startNotificationsScheduler(database, stdoutLog)
    const stopSaturation = startSaturationSampler(stdoutLog)
    const stopPrivacyCleanup = startPrivacyCleanup(database, stdoutLog)
    server.headersTimeout=10000
    server.requestTimeout=30000
    server.keepAliveTimeout=5000

    const shutdown = (): void => {
      if (encerrando) return
      encerrando = true
      stopSaturation()
      app.locals.closeNotifications()
      const recurringStopped = Promise.all([stopRecurring(), stopNotifications(), stopPrivacyCleanup(), signal.close()])
      const limite = setTimeout(() => { process.exit(1) }, 15000)
      limite.unref()
      server.close(() => {
        void recurringStopped.then(() => Promise.all([database.$disconnect(), probe.close()])).catch(() => {
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
