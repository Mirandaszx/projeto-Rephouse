import express, { type Express } from 'express'
import { createHealthRouter } from './modulos/saude/health.routes.js'
import { errorHandler } from './compartilhado/http/error-handler.js'
import { notFoundHandler } from './compartilhado/http/not-found.js'
import multer from 'multer'
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
import { createReceiptStore } from './infraestrutura/armazenamento/receipts.js'
import { createTarefasService } from './modulos/tarefas/tarefas.service.js'
import { createTarefasController } from './modulos/tarefas/tarefas.controller.js'
import { createTarefasRouter } from './modulos/tarefas/tarefas.routes.js'
import { createDashboardService } from './modulos/painel/dashboard.service.js'
import { createDashboardController } from './modulos/painel/dashboard.controller.js'
import { createMasterService } from './modulos/administracao/master.service.js'
import { createMasterController } from './modulos/administracao/master.controller.js'
import { openApiDocument } from './openapi.js'

interface AppOptions { database?: PrismaClient; jwtSecret?: string; uploadDirectory?: string }

// Monta HTTP sem abrir porta ou conexão: reutilizável nos testes.
export function createApp(options: AppOptions = {}): Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))
  app.use('/api/health', createHealthRouter())
  app.get('/api/openapi.json', (_req, res) => { res.json(openApiDocument) })
  if (options.database) {
    if (!options.jwtSecret || options.jwtSecret.length < 32) throw new Error('JWT_SECRET precisa ter ao menos 32 caracteres.')
    const db = options.database
    const auth = createAuthController(createAuthService(db, options.jwtSecret))
    const republicas = createRepublicasService(db)
    const rc = createRepublicasController(republicas)
    const receipts = createReceiptStore(options.uploadDirectory ?? 'armazenamento/comprovantes')
    const financeiro = createFinanceiroService(db)
    const fc = createFinanceiroController(financeiro, receipts)
    const tarefas = createTarefasService(db)
    const dashboard = createDashboardService(db)
    const master = createMasterController(createMasterService(db))
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 4 } })
    app.use('/api/auth', createAuthRouter(auth))
    const api = express.Router()
    api.use(auth.authenticate)
    api.get('/me', auth.me).patch('/me', auth.edit).delete('/me', auth.deleteAccount)
    api.get('/me/financeiro', fc.personal).get('/me/financeiro/:id', fc.personalDetail)
    api.use('/republicas', createRepublicasRouter(rc))
    api.get('/membros', rc.members).patch('/membros/:id', rc.deactivate)
    api.use('/despesas', createFinanceiroRouter(fc))
    api.post('/pagamentos', upload.single('comprovante'), fc.pay)
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
    api.use('/master/republicas/:republicaId/despesas', createFinanceiroRouter(createFinanceiroController(financeiro, receipts, true)))
    api.use('/master/republicas/:republicaId/tarefas', createTarefasRouter(createTarefasController(tarefas, true)))
    api.get('/master/republicas/:republicaId/dashboard', createDashboardController(dashboard, true).get)
    app.use('/api', api)
  }
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
