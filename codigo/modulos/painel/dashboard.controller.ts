import type { createDashboardService } from './dashboard.service.js'
import { endpoint, idParam } from '../../compartilhado/http/validation.js'
export function createDashboardController(service: ReturnType<typeof createDashboardService>, master = false) {
  return { get: endpoint((req, actor) => service.get(actor, master ? idParam(req, 'republicaId') : undefined)) }
}
