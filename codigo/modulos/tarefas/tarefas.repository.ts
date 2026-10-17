import type { Prisma } from '../../gerado/prisma/client.js'
import {pageArgs,type PageInput} from '../../compartilhado/http/pagination.js'
export class TarefasRepository {
  criar(tx: Prisma.TransactionClient, data: Prisma.TarefaUncheckedCreateInput) { return tx.tarefa.create({ data }) }
  editar(tx: Prisma.TransactionClient, id: string, data: Prisma.TarefaUncheckedUpdateInput) { return tx.tarefa.update({ where: { id }, data }) }
  responsavelAtivo(tx: Prisma.TransactionClient, id: string, republicaId: string) {
    return tx.membroRepublica.findFirst({ where: { id, republicaId, ativo: true, usuario: { ativo: true, excluidoEm: null } } })
  }
  contar(tx:Prisma.TransactionClient,republicaId:string){return tx.tarefa.count({where:{republicaId}})}
  listar(tx: Prisma.TransactionClient, republicaId: string,page:PageInput) {
    return tx.tarefa.findMany({ ...pageArgs(page),where: { republicaId }, orderBy: [{ status: 'asc' }, { prazo: 'asc' },{id:'asc'}] })
  }
  buscar(tx: Prisma.TransactionClient, id: string, republicaId: string) {
    return tx.tarefa.findFirst({ where: { id, republicaId }, include: { responsavel: true } })
  }
}
