import { Router } from 'express'
import { z } from 'zod'
import type { PrismaClient } from '../../gerado/prisma/client.js'
import type { Actor } from '../../compartilhado/context.js'
import { endpoint, idParam } from '../../compartilhado/http/validation.js'
import { pagination } from '../../compartilhado/http/pagination.js'
import { createNotificationsService } from './notificacoes.service.js'
import { createNotificationsStreams, type NotificationsSignal } from './notificacoes.stream.js'

const categoria = z.enum(['TODAS','TAREFAS','DESPESAS','GERAIS'])
export function createNotificationsRouter(db: PrismaClient, verify: (token: string) => Promise<Actor>, signal?: NotificationsSignal) {
  const router = Router(), service = createNotificationsService(db)
  const stream = createNotificationsStreams(service, verify, signal)
  router.get('/eventos', stream.handler)
  router.get('/nao-lidas', endpoint((_req, actor) => service.unread(actor)))
  router.get('/', endpoint((req, actor) => service.list(actor, categoria.parse(req.query.categoria ?? 'TAREFAS'), pagination(req.query, false, { categoria: categoria.optional() }))))
  router.patch('/lidas', endpoint((req, actor) => service.read(actor, z.object({ categoria }).strict().parse(req.body)), 204))
  router.patch('/:id/lida', endpoint((req, actor) => { z.object({}).strict().parse(req.body ?? {}); return service.read(actor, { id: idParam(req) }) }, 204))
  return { router, close: stream.close }
}
