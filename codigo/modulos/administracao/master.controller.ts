import { z } from 'zod'
import type { createMasterService } from './master.service.js'
import { endpoint, idParam } from '../../compartilhado/http/validation.js'
export function createMasterController(service: ReturnType<typeof createMasterService>) {
  return {
    users: endpoint((_req, actor) => service.users(actor)),
    republics: endpoint((_req, actor) => service.republics(actor)),
    dashboard: endpoint((_req, actor) => service.dashboard(actor)),
    userStatus: endpoint((req, actor) => service.userStatus(actor, idParam(req), z.object({ ativo: z.boolean() }).strict().parse(req.body).ativo)),
    republicStatus: endpoint((req, actor) => service.republicStatus(actor, idParam(req), z.object({ ativa: z.boolean() }).strict().parse(req.body).ativa)),
  }
}
