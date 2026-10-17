import type { PrismaClient } from '../../gerado/prisma/client.js'
import { withActor, republicContext, type Actor } from '../../compartilhado/context.js'
import { DashboardRepository } from './dashboard.repository.js'
export function createDashboardService(db: PrismaClient) {
  const repository = new DashboardRepository()
  return { get: (actor: Actor, scope?: string) => withActor(db, actor, async (tx, user) => {
    const republic = await republicContext(tx, user, scope)
    // Uma única transação mantém todos os indicadores no mesmo snapshot.
    return repository.resumo(tx, republic.id)
  }) }
}
