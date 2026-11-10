import { z } from 'zod'
import type { createMasterService } from './master.service.js'
import { endpoint, idParam } from '../../compartilhado/http/validation.js'
import { collectionEndpoint } from '../integracao/frontend-compat.js'
export function createMasterController(service: ReturnType<typeof createMasterService>) {
  return {
    users: collectionEndpoint((_req, actor, page) => service.users(actor, page)),
    republics: collectionEndpoint((_req, actor, page) => service.republics(actor, page)),
    dashboard: endpoint((_req, actor) => service.dashboard(actor)),
    userStatus: endpoint((req, actor) => service.userStatus(actor, idParam(req), z.object({ ativo: z.boolean() }).strict().parse(req.body).ativo)),
    republicStatus: endpoint((req, actor) => service.republicStatus(actor, idParam(req), z.object({ ativa: z.boolean() }).strict().parse(req.body).ativa)),
  }
}
