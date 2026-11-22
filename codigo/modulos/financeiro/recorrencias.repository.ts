import type { Prisma } from '../../gerado/prisma/client.js'

export const recurringInclude = {
  configuracoes: { orderBy: [{ vigencia: 'desc' }, { versao: 'desc' }], include: { participantes: { orderBy: { membroId: 'asc' } } } },
} satisfies Prisma.RecorrenciaDespesaInclude
export type RecurringRecord = Prisma.RecorrenciaDespesaGetPayload<{ include: typeof recurringInclude }>
export function recurringPublic(item: RecurringRecord) {
  return { id: item.id, republicaId: item.republicaId, despesaOrigemId: item.despesaOrigemId,
    inicio: item.inicio.toISOString().slice(0, 7), fim: item.fim?.toISOString().slice(0, 10) ?? null,
    proximaCompetencia: item.proximaCompetencia.toISOString().slice(0, 7),
    ativa: item.ativa, pausaMotivo: item.pausaMotivo,
    configuracoes: item.configuracoes.map(config => ({ id: config.id, vigencia: config.vigencia.toISOString().slice(0, 7),
      titulo: config.titulo, categoria: config.categoria, valorTotal: config.valorTotal.toFixed(2), diaVencimento: config.diaVencimento,
      membroIds: config.participantes.map(person => person.membroId) })),
  }
}

export class RecorrenciasRepository {
  async lock(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM recorrencias_despesa WHERE id=${id}::uuid FOR UPDATE`
    return tx.recorrenciaDespesa.findUnique({ where: { id }, include: recurringInclude })
  }
  byKey(tx: Prisma.TransactionClient, key: string) {
    return tx.recorrenciaDespesa.findUnique({ where: { chaveIdempotencia: key }, include: recurringInclude })
  }
  async activeMembers(tx: Prisma.TransactionClient, republicaId: string, ids: string[]) {
    return tx.membroRepublica.count({ where: { id: { in: ids }, republicaId, ativo: true, usuario: { ativo: true, excluidoEm: null } } })
  }
}
