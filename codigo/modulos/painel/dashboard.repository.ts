import { Prisma } from '../../gerado/prisma/client.js'
import { appTimeZone } from '../../configuracao/time-zone.js'
export class DashboardRepository {
  async resumo(tx: Prisma.TransactionClient, republicaId?: string) {
    // PostgreSQL resolve as fronteiras conforme o fuso, inclusive mudanças históricas.
    const zone = appTimeZone()
    const [month] = await tx.$queryRaw<{start: Date; end: Date}[]>`
      SELECT date_trunc('month', now() AT TIME ZONE ${zone}) AT TIME ZONE ${zone} AS start,
      (date_trunc('month', now() AT TIME ZONE ${zone}) + interval '1 month') AT TIME ZONE ${zone} AS end`
    if (!month) throw new Error('Não foi possível calcular o mês de referência.')
    const { start, end } = month
    const where = republicaId ? { republicaId } : {}
    const totals = await tx.rateioDespesa.aggregate({ where: { despesa: where }, _sum: { valorDevido: true, valorPago: true } })
    const paid = await tx.pagamento.aggregate({ where: { rateio: { despesa: where }, dataPagamento: { gte: start, lt: end } }, _sum: { valor: true } })
    return {
      totalPendente: (totals._sum.valorDevido ?? new Prisma.Decimal(0)).minus(totals._sum.valorPago ?? 0),
      totalPagoNoMes: paid._sum.valor ?? new Prisma.Decimal(0),
      tarefasAbertas: await tx.tarefa.count({ where: { ...where, status: 'ABERTA' } }),
      moradoresAtivos: await tx.membroRepublica.count({ where: { ...where, ativo: true } }),
      proximasContas: await tx.despesa.findMany({ where: { ...where, status: 'PENDENTE' }, orderBy: { vencimento: 'asc' }, take: 5 }),
    }
  }
}
