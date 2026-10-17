import { Prisma } from '../../gerado/prisma/client.js'
export class DashboardRepository {
  async resumo(tx: Prisma.TransactionClient, republicaId?: string) {
    // Fortaleza é UTC-3: os limites mensais são convertidos para instantes UTC.
    const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
    const year = Number(month.find(p => p.type === 'year')?.value)
    const number = Number(month.find(p => p.type === 'month')?.value)
    const start = new Date(Date.UTC(year, number - 1, 1, 3))
    const end = new Date(Date.UTC(year, number, 1, 3))
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
