import { z } from 'zod'
import type { TarefasService } from './tarefas.service.js'
import { dateOnly, endpoint, idParam, uuid } from '../../compartilhado/http/validation.js'
import { collectionEndpoint } from '../integracao/frontend-compat.js'
const schema = z.object({ titulo: z.string().trim().min(1).max(160), responsavelId: uuid.nullable().optional(),
  descricao: z.string().max(5000).optional(), prazo: dateOnly.nullable().optional() }).strict()
export function createTarefasController(service: TarefasService, master = false) {
  const scope = (req: Parameters<typeof idParam>[0]) => master ? idParam(req, 'republicaId') : undefined
  return {
    list: collectionEndpoint((req, actor, page) => service.list(actor, page, scope(req))),
    get: endpoint((req, actor) => service.get(actor, idParam(req), scope(req))),
    assume: endpoint((req, actor) => { z.object({}).strict().parse(req.body ?? {}); return service.assume(actor, idParam(req), scope(req)) }),
    release: endpoint((req, actor) => { z.object({}).strict().parse(req.body ?? {}); return service.release(actor, idParam(req), scope(req)) }),
    create: endpoint((req, actor) => service.create(actor, schema.parse(req.body), scope(req), uuid.optional().parse(req.get('Idempotency-Key'))), 201),
    edit: endpoint((req, actor) => service.edit(actor, idParam(req), schema.partial().extend({
      status: z.enum(['ABERTA','CONCLUIDA']).optional(),
    }).strict().parse(req.body), scope(req))),
  }
}
