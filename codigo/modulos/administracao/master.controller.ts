import { z } from 'zod'
import type { createMasterService } from './master.service.js'
import { endpoint, idParam } from '../../compartilhado/http/validation.js'
import {pagination} from '../../compartilhado/http/pagination.js'
export function createMasterController(service: ReturnType<typeof createMasterService>) {
  return {
    users: endpoint((req, actor) => service.users(actor,pagination(req.query))),
    republics: endpoint((req, actor) => service.republics(actor,pagination(req.query))),
    dashboard: endpoint((_req, actor) => service.dashboard(actor)),
    userStatus: endpoint((req, actor) => service.userStatus(actor, idParam(req), z.object({ ativo: z.boolean() }).strict().parse(req.body).ativo)),
    republicStatus: endpoint((req, actor) => service.republicStatus(actor, idParam(req), z.object({ ativa: z.boolean() }).strict().parse(req.body).ativa)),
  }
}
