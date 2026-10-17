import type { Prisma } from '../../gerado/prisma/client.js'
export class TarefasRepository {
  criar(tx: Prisma.TransactionClient, data: Prisma.TarefaUncheckedCreateInput) { return tx.tarefa.create({ data }) }
  editar(tx: Prisma.TransactionClient, id: string, data: Prisma.TarefaUncheckedUpdateInput) { return tx.tarefa.update({ where: { id }, data }) }
  responsavelAtivo(tx: Prisma.TransactionClient, id: string, republicaId: string) {
    return tx.membroRepublica.findFirst({ where: { id, republicaId, ativo: true, usuario: { ativo: true, excluidoEm: null } } })
  }
  listar(tx: Prisma.TransactionClient, republicaId: string) {
    return tx.tarefa.findMany({ where: { republicaId }, orderBy: [{ status: 'asc' }, { prazo: 'asc' }] })
  }
  buscar(tx: Prisma.TransactionClient, id: string, republicaId: string) {
    return tx.tarefa.findFirst({ where: { id, republicaId }, include: { responsavel: true } })
  }
}
