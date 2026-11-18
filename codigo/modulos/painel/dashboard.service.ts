import type { PrismaClient } from '../../gerado/prisma/client.js'
import { withActor, republicContext, type Actor } from '../../compartilhado/context.js'
import { DashboardRepository } from './dashboard.repository.js'
import { civilDate } from '../../configuracao/time-zone.js'
import { personalSummary, expenseView } from '../financeiro/financeiro.consultas.js'
export function createDashboardService(db: PrismaClient) {
  const repository = new DashboardRepository()
  return { get: (actor: Actor, scope?: string) => withActor(db, actor, async (tx, user) => {
    const republic = await republicContext(tx, user, scope)
    // Uma única transação mantém todos os indicadores no mesmo snapshot.
    const summary = await repository.resumo(tx, republic.id)
    const today = civilDate()
    return { ...summary, dataReferencia: today,
      proximasContas: summary.proximasContas.map(item => expenseView(item, today)),
      financeiroIndividual: await personalSummary(tx, user.id, { republicaId: republic.id, competencia: today.slice(0, 7) }, today),
      financeiroIndividualGeral: await personalSummary(tx, user.id, { republicaId: republic.id }, today) }
  }) }
}
