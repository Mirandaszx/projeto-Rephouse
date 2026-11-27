import express, { type Express } from 'express'
import { join, resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createHealthRouter } from './modulos/saude/health.routes.js'
import { errorHandler } from './compartilhado/http/error-handler.js'
import { notFoundHandler } from './compartilhado/http/not-found.js'
import multer from 'multer'
import { createPhotoRouter } from './modulos/perfil/foto.routes.js'
import cors from 'cors'
import helmet from 'helmet'
import { createUploadLimit } from './compartilhado/http/upload-limit.js'
import type { PrismaClient } from './gerado/prisma/client.js'
import { createAuthService } from './modulos/autenticacao/auth.service.js'
import { createAuthController } from './modulos/autenticacao/auth.controller.js'
import { createAuthRouter } from './modulos/autenticacao/auth.routes.js'
import { createRepublicasService } from './modulos/republicas/republicas.service.js'
import { createRepublicasController } from './modulos/republicas/republicas.controller.js'
import { createRepublicasRouter } from './modulos/republicas/republicas.routes.js'
import { createFinanceiroService } from './modulos/financeiro/financeiro.service.js'
import { createFinanceiroController } from './modulos/financeiro/financeiro.controller.js'
import { createFinanceiroRouter } from './modulos/financeiro/financeiro.routes.js'
import { createRecorrenciasRouter } from './modulos/financeiro/recorrencias.routes.js'
import { createTarefasService } from './modulos/tarefas/tarefas.service.js'
import { createTarefasController } from './modulos/tarefas/tarefas.controller.js'
import { createTarefasRouter } from './modulos/tarefas/tarefas.routes.js'
import { createDashboardService } from './modulos/painel/dashboard.service.js'
import { createDashboardController } from './modulos/painel/dashboard.controller.js'
import { createMasterService } from './modulos/administracao/master.service.js'
import { createMasterController } from './modulos/administracao/master.controller.js'
import { openApiDocument } from './openapi.js'
import { requestLog, type LogSink } from './compartilhado/http/request-log.js'
import { isReady } from './modulos/saude/readiness.js'
import type { GoogleOptions } from './modulos/autenticacao/google.service.js'
import { createFrontendCompatibilityRouter, FRONT_PREFIX } from './modulos/integracao/frontend-compat.js'
import { exportarDadosPessoais } from './modulos/privacidade/exportar.js'
import type { EmailOptions } from './infraestrutura/email/resend.js'
import { createNotificationsRouter } from './modulos/notificacoes/notificacoes.routes.js'
import type { NotificationsSignal } from './modulos/notificacoes/notificacoes.stream.js'

interface AppOptions { database?: PrismaClient; jwtSecret?: string; corsOrigins?: string[]; log?: LogSink; readiness?: () => Promise<unknown>; google?: GoogleOptions; email?: EmailOptions; notificationsSignal?: NotificationsSignal; trustProxy?: number; privacyContact?: string; interfaceDir?: string }

// Rotas operacionais que continuam na superfície canônica quando a API também serve a interface.
const OPERATIONAL_PATHS = ['/api/health', '/api/ready', '/api/openapi.json']

// Com a interface no mesmo serviço, a página chama /api/* e recebe a superfície da interface, como faz o Nginx da demo.
function frontendPath(url: string): string {
  if (!url.startsWith('/api/') || url.startsWith(FRONT_PREFIX + '/') || url.startsWith(FRONT_PREFIX + '?')) return url
  if (OPERATIONAL_PATHS.some(path => url === path || url.startsWith(path + '/') || url.startsWith(path + '?'))) return url
  return FRONT_PREFIX + url.slice('/api'.length)
}

// Scripts embutidos no index.html (o que aplica a aparência antes do primeiro desenho) entram na CSP pelo hash,
// calculado do arquivo compilado: só aquele conteúdo exato roda, sem liberar 'unsafe-inline'.
function inlineScriptHashes(dir: string): string[] {
  const html = readFileSync(join(dir, 'index.html'), 'utf8')
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => `'sha256-${createHash('sha256').update(match[1] ?? '').digest('base64')}'`)
}

// Política de segurança das páginas: só a origem própria, mais o necessário para o login com Google.
const interfaceSecurity = (scriptHashes: string[]) => ({
  strictTransportSecurity: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' as const },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
  contentSecurityPolicy: { directives: {
    upgradeInsecureRequests: null,
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", ...scriptHashes, 'https://accounts.google.com/gsi/client'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'],
    frameSrc: ['https://accounts.google.com/gsi/'],
    connectSrc: ["'self'", 'https://accounts.google.com/gsi/'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https://*.googleusercontent.com'],
    fontSrc: ["'self'", 'data:'],
  } },
})

// Monta HTTP sem abrir porta ou conexão: reutilizável nos testes.
export function createApp(options: AppOptions = {}): Express {
  const app = express()
  app.disable('x-powered-by')
  if (options.interfaceDir) app.use((req, _res, next) => { req.url = frontendPath(req.url); next() })
  // Atrás do Vite ou do Nginx, o IP do cliente vem de X-Forwarded-For; sem proxy confiável, o cabeçalho é ignorado.
  if (options.trustProxy) app.set('trust proxy', options.trustProxy)
  app.use(requestLog(options.log))
  app.use(helmet(options.interfaceDir ? interfaceSecurity(inlineScriptHashes(resolve(options.interfaceDir))) : {strictTransportSecurity:false,contentSecurityPolicy:{directives:{upgradeInsecureRequests:null}}}))
  app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next()})
  // CORS regula leitura pelo navegador. Identidade e permissões continuam nas rotas.
  app.use(cors({
    origin: options.corsOrigins?.length ? options.corsOrigins : false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['Content-Disposition', 'Retry-After', 'RateLimit', 'RateLimit-Policy', 'X-Request-Id'],
    credentials: false, maxAge: 600,
  }))
  app.use(express.json({ limit: '1mb' }))
  app.use('/api/health', createHealthRouter())
  app.get('/api/ready', async (_req, res) => {
    const ready = await isReady(options.readiness ?? (options.database ? () => options.database!.$queryRaw`SELECT 1` : undefined))
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' })
  })
  app.get('/api/openapi.json', (_req, res) => { res.json(openApiDocument) })
  // Contato para pedidos de privacidade (LGPD, art. 41): público e lido da configuração, nunca fixo no código.
  app.get(['/api/privacidade', FRONT_PREFIX + '/privacidade'], (_req, res) => { res.json({ contato: options.privacyContact ?? null, versaoPolitica: '2026-11-26' }) })
  if (options.database) {
    if (!options.jwtSecret || options.jwtSecret.length < 32) throw new Error('JWT_SECRET precisa ter ao menos 32 caracteres.')
    const db = options.database
    const authService = createAuthService(db, options.jwtSecret, options.google, options.email)
    const auth = createAuthController(authService, options.corsOrigins,
      { clientId: options.google?.clientId ?? '', ...options.google, secureCookies: options.email?.secureCookies ?? options.google?.secureCookies })
    const republicas = createRepublicasService(db)
    const rc = createRepublicasController(republicas)
    const financeiro = createFinanceiroService(db)
    const fc = createFinanceiroController(financeiro)
    const tarefas = createTarefasService(db)
    const dashboard = createDashboardService(db)
    const master = createMasterController(createMasterService(db))
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 4 } })
    const authRouter = createAuthRouter(auth)
    const api = express.Router()
    api.use(auth.authenticate)
    api.use(createPhotoRouter(db, auth.activeSession))
    const notifications = createNotificationsRouter(db, token => authService.verifyToken(token), options.notificationsSignal)
    api.use('/notificacoes', notifications.router)
    app.locals.closeNotifications = notifications.close
    api.get('/me', auth.me).patch('/me', auth.edit).delete('/me', auth.deleteAccount)
    api.get('/me/dados', async (_req, res) => {
      res.set('Content-Disposition', 'attachment; filename="rephouse-meus-dados.json"').json(await exportarDadosPessoais(db, res.locals.actor.id))
    })
    api.get('/me/financeiro/resumo', fc.personalSummary)
    api.get('/me/financeiro', fc.personal).get('/me/financeiro/:id', fc.personalDetail)
    api.use('/republicas', createRepublicasRouter(rc))
    api.get('/membros', rc.members).patch('/membros/:id', rc.deactivate)
    api.use('/despesas', createFinanceiroRouter(fc))
    api.use('/recorrencias', createRecorrenciasRouter(db))
    api.post('/pagamentos', auth.activeSession, createUploadLimit(), upload.single('comprovante'), fc.pay)
    api.get('/pagamentos/:id/comprovante', fc.receipt)
    api.use('/tarefas', createTarefasRouter(createTarefasController(tarefas)))
    api.get('/dashboard', createDashboardController(dashboard).get)
    api.get('/master/usuarios', master.users).get('/master/republicas', master.republics)
    api.patch('/master/usuarios/:id/status', master.userStatus).patch('/master/republicas/:id/status', master.republicStatus)
    api.get('/master/dashboard', master.dashboard)
    // Os mesmos serviços atendem MASTER com escopo explícito, sem duplicar políticas.
    const mrc = createRepublicasController(republicas, true)
    api.get('/master/republicas/:republicaId', mrc.current).patch('/master/republicas/:republicaId', mrc.edit)
    api.get('/master/republicas/:republicaId/membros', mrc.members).patch('/master/republicas/:republicaId/membros/:id', mrc.deactivate)
    api.post('/master/republicas/:republicaId/transferir-admin', mrc.transfer)
    api.use('/master/republicas/:republicaId/despesas', createFinanceiroRouter(createFinanceiroController(financeiro, true)))
    api.use('/master/republicas/:republicaId/recorrencias', createRecorrenciasRouter(db, true))
    api.use('/master/republicas/:republicaId/tarefas', createTarefasRouter(createTarefasController(tarefas, true)))
    api.get('/master/republicas/:republicaId/dashboard', createDashboardController(dashboard, true).get)
    app.use(FRONT_PREFIX, createFrontendCompatibilityRouter(authRouter, api))
    app.use('/api/auth', authRouter)
    app.use('/api', api)
  }
  if (options.interfaceDir) {
    const dir = resolve(options.interfaceDir)
    // Arquivos com hash no nome podem ficar em cache; o index.html é sempre buscado de novo.
    app.use('/assets', express.static(join(dir, 'assets'), { immutable: true, maxAge: '1y', index: false }))
    app.use(express.static(dir, { index: false }))
    app.use((req, res, next) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api/')) { next(); return }
      res.set('Cache-Control', 'no-store').sendFile(join(dir, 'index.html'))
    })
  }
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
