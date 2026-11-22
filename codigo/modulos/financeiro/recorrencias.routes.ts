import { Router } from 'express'
import { z } from 'zod'
import type { PrismaClient } from '../../gerado/prisma/client.js'
import { endpoint, idParam, money, uuid } from '../../compartilhado/http/validation.js'
import { collectionEndpoint } from '../integracao/frontend-compat.js'
import { competenciaSchema } from './dominio/competencia.js'
import { createRecorrenciasService } from './recorrencias.service.js'

const config = z.object({ titulo: z.string().trim().min(1).max(160), categoria: z.string().trim().min(1).max(80),
  valorTotal: money, diaVencimento: z.number().int().min(1).max(31), membroIds: z.array(uuid).min(1) }).strict()
const fim = z.iso.date().refine(value => value >= '1900-01-01' && value <= '2199-12-31').nullable().optional()
const create = config.extend({ inicio: competenciaSchema, fim, despesaOrigemId: uuid.optional() })
const edit = config.partial().extend({ ativa: z.boolean().optional(), fim }).refine(value => Object.keys(value).length > 0)

export function createRecorrenciasRouter(db: PrismaClient, master = false) {
  const router = Router({ mergeParams: true }), service = createRecorrenciasService(db)
  const scope = (req: Parameters<typeof idParam>[0]) => master ? idParam(req, 'republicaId') : undefined
  router.get('/', collectionEndpoint((req, actor, page) => service.list(actor, page, scope(req))))
  router.post('/', endpoint((req, actor) => service.create(actor, create.parse(req.body), uuid.parse(req.get('Idempotency-Key')), scope(req)), 201))
  router.get('/:id', endpoint((req, actor) => service.detail(actor, idParam(req), scope(req))))
  router.patch('/:id', endpoint((req, actor) => service.edit(actor, idParam(req), edit.parse(req.body), scope(req))))
  router.get('/:id/competencias', collectionEndpoint((req, actor, page) => service.occurrences(actor, idParam(req), page, scope(req))))
  router.post('/:id/competencias/:competencia/revisar', endpoint((req, actor) => {
    z.object({}).strict().parse(req.body)
    return service.review(actor, idParam(req), competenciaSchema.parse(req.params.competencia), scope(req))
  }, 204))
  return router
}
