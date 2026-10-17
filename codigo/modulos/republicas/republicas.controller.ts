import { z } from 'zod'
import type { RepublicasService } from './republicas.service.js'
import { endpoint, idParam, name, uuid } from '../../compartilhado/http/validation.js'
import {pagination} from '../../compartilhado/http/pagination.js'

const codeSchema = z.object({ codigoEntrada: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6,32}$/) }).strict()
export function createRepublicasController(service: RepublicasService, master = false) {
  const scope = (req: Parameters<typeof idParam>[0]) => master ? idParam(req, 'republicaId') : undefined
  return {
    create: endpoint((req, actor) => service.create(actor, z.object({ nome: name, endereco: z.string().trim().max(255).optional() }).strict().parse(req.body)), 201),
    current: endpoint((req, actor) => service.current(actor, scope(req))),
    edit: endpoint((req, actor) => service.edit(actor, z.object({ nome: name.optional(), endereco: z.string().trim().max(255).nullable().optional() }).strict().parse(req.body), scope(req))),
    join: endpoint((req, actor) => service.join(actor, codeSchema.parse(req.body).codigoEntrada), 201),
    leave: endpoint((_req, actor) => service.leave(actor), 204),
    swap: endpoint((req, actor) => service.swap(actor, codeSchema.parse(req.body).codigoEntrada)),
    members: endpoint((req, actor) => service.members(actor, z.enum(['true','false']).optional().parse(req.query.inativos) === 'true',pagination(req.query,true), scope(req))),
    deactivate: endpoint((req, actor) => {
      z.object({ ativo: z.literal(false) }).strict().parse(req.body)
      return service.deactivate(actor, idParam(req), scope(req))
    }),
    transfer: endpoint((req, actor) => service.transfer(actor, z.object({ membroId: uuid }).strict().parse(req.body).membroId, scope(req))),
  }
}
