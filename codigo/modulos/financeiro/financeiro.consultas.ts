import { Prisma } from '../../gerado/prisma/client.js'
import { civilDate } from '../../configuracao/time-zone.js'
import { addDays, dueState, monthDate, nextMonth, DIAS_PROXIMO_VENCIMENTO, type FinancialFilter } from './dominio/competencia.js'

export function dueWhere(filter: FinancialFilter): Prisma.DateTimeFilter | undefined {
  const parts: Prisma.DateTimeFilter = {}
  if (filter.competencia) { parts.gte = monthDate(filter.competencia); parts.lt = monthDate(nextMonth(filter.competencia)) }
  return Object.keys(parts).length ? parts : undefined
}
function timeCondition(filter: FinancialFilter, today: string): Prisma.DespesaWhereInput {
  return filter.situacao === 'ATRASADAS' ? { vencimento: { lt: new Date(`${today}T00:00:00.000Z`) } }
    : filter.situacao === 'PROXIMAS' ? { vencimento: { gte: new Date(`${today}T00:00:00.000Z`), lte: new Date(`${addDays(today, DIAS_PROXIMO_VENCIMENTO)}T00:00:00.000Z`) } } : {}
}
export function personalWhere(userId: string, filter: FinancialFilter & { republicaId?: string } = {}, today = civilDate()): Prisma.RateioDespesaWhereInput {
  return { membro: { usuarioId: userId },
    ...(filter.situacao === 'PAGAS' ? { status: 'PAGO' } : filter.situacao && filter.situacao !== 'TODAS' ? { status: { not: 'PAGO' } } : {}),
    despesa: { AND: [{ ...(filter.republicaId ? { republicaId: filter.republicaId } : {}), vencimento: dueWhere(filter) }, timeCondition(filter, today)] } }
}
export function expensesWhere(republicaId: string, userId: string, filter: FinancialFilter = {}, today = civilDate()): Prisma.DespesaWhereInput {
  const personal = filter.escopo === 'PESSOAL'
  return { republicaId, AND: [{ vencimento: dueWhere(filter) }, timeCondition(filter, today)],
    ...(personal ? { rateios: { some: personalWhere(userId, { situacao: filter.situacao }, today) } }
      : filter.situacao === 'PAGAS' ? { status: 'PAGA' } : filter.situacao && filter.situacao !== 'TODAS' ? { status: 'PENDENTE' } : {}) }
}
export const originInclude = { select: { recorrenciaId: true, competencia: true } } as const
export function expenseView<T extends { vencimento: Date; status: string; rateios?: { valorDevido: Prisma.Decimal; valorPago: Prisma.Decimal }[];
  competenciaRecorrente?: { recorrenciaId: string; competencia: Date } | null }>(expense: T, today = civilDate()) {
  const { competenciaRecorrente, ...publicExpense } = expense
  return { ...publicExpense, dataReferencia: today, situacaoVencimento: dueState(expense.vencimento, expense.status !== 'PAGA', today),
    ...(expense.rateios ? { rateios: expense.rateios.map(share => ({ ...share,
      valorRestante: Prisma.Decimal.max(0, share.valorDevido.minus(share.valorPago)).toFixed(2), dataReferencia: today,
      situacaoVencimento: dueState(expense.vencimento, share.valorPago.lessThan(share.valorDevido), today),
      pagamentoParcial: share.valorPago.greaterThan(0) && share.valorPago.lessThan(share.valorDevido) })) as T['rateios'] } : {}),
    pagamentoParcial: expense.status !== 'PAGA' && Boolean(expense.rateios?.some(item => item.valorPago.greaterThan(0))),
    recorrencia: competenciaRecorrente ? { id: competenciaRecorrente.recorrenciaId, competencia: competenciaRecorrente.competencia.toISOString().slice(0, 7) } : null }
}
export function shareView<T extends { valorDevido: Prisma.Decimal; valorPago: Prisma.Decimal; despesa: { vencimento: Date } }>(share: T, today = civilDate()) {
  const pending = Prisma.Decimal.max(0, share.valorDevido.minus(share.valorPago))
  return { ...share, valorRestante: pending.toFixed(2), dataReferencia: today,
    situacaoVencimento: dueState(share.despesa.vencimento, pending.greaterThan(0), today),
    pagamentoParcial: pending.greaterThan(0) && share.valorPago.greaterThan(0) }
}
export async function personalSummary(tx: Prisma.TransactionClient, userId: string, filter: FinancialFilter & { republicaId?: string } = {}, today = civilDate()) {
  // Somar parcelas, nunca o join de pagamentos: múltiplos pagamentos não multiplicam a obrigação.
  const where = personalWhere(userId, filter, today)
  const totals = await tx.rateioDespesa.aggregate({ where, _sum: { valorDevido: true, valorPago: true }, _count: true })
  const zero = new Prisma.Decimal(0)
  const due = totals._sum.valorDevido ?? zero, paid = totals._sum.valorPago ?? zero
  return { competencia: filter.competencia ?? null, dataReferencia: today, totalDevido: due.toFixed(2), totalPago: paid.toFixed(2),
    saldoPendente: Prisma.Decimal.max(0, due.minus(paid)).toFixed(2), totalItens: totals._count,
    rateiosPendentes: await tx.rateioDespesa.count({ where: { AND: [where, { status: { not: 'PAGO' } }] } }) }
}
