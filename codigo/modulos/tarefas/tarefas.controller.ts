import { z } from 'zod'
import type { TarefasService } from './tarefas.service.js'
import { dateOnly, endpoint, idParam, uuid } from '../../compartilhado/http/validation.js'
const schema = z.object({ titulo: z.string().trim().min(1).max(160), responsavelId: uuid,
  descricao: z.string().max(5000).optional(), prazo: dateOnly.nullable().optional() }).strict()
export function createTarefasController(service: TarefasService, master = false) {
  const scope = (req: Parameters<typeof idParam>[0]) => master ? idParam(req, 'republicaId') : undefined
  return {
    list: endpoint((req, actor) => service.list(actor, scope(req))),
    create: endpoint((req, actor) => service.create(actor, schema.parse(req.body), scope(req)), 201),
    edit: endpoint((req, actor) => service.edit(actor, idParam(req), schema.partial().extend({
      status: z.enum(['ABERTA','CONCLUIDA']).optional(),
    }).strict().parse(req.body), scope(req))),
  }
}
