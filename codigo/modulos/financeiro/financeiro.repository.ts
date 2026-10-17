import type { Prisma } from '../../gerado/prisma/client.js'
import type { ParcelaRateio } from './dominio/rateio.js'
import type { CriarDespesaInput, RegistrarPagamentoInput } from './financeiro.types.js'
import {pageArgs,type PageInput} from '../../compartilhado/http/pagination.js'

// Recebe a transação do service; não cria conexão nem abre transação própria.
export class FinanceiroRepository {
  contarMembros(tx: Prisma.TransactionClient, republicaId: string, ids: readonly string[]) {
    return tx.membroRepublica.count({ where: { id: { in: [...ids] }, republicaId, ativo: true, usuario: { ativo: true, excluidoEm: null } } })
  }
  pagamentoPorChave(tx: Prisma.TransactionClient, chaveIdempotencia: string) {
    return tx.pagamento.findUnique({ where: { chaveIdempotencia }, include: {comprovante:{select:{pagamentoId:true}}} })
  }
  listarDespesas(tx: Prisma.TransactionClient, republicaId: string, page:PageInput) {
    return tx.despesa.findMany({ ...pageArgs(page),where: { republicaId }, include: { rateios: true }, orderBy: [{ vencimento: 'asc' },{id:'asc'}] })
  }
  contarDespesas(tx:Prisma.TransactionClient,republicaId:string){return tx.despesa.count({where:{republicaId}})}
  contarPessoal(tx:Prisma.TransactionClient,usuarioId:string){return tx.rateioDespesa.count({where:{membro:{usuarioId}}})}
  detalharDespesa(tx: Prisma.TransactionClient, id: string, republicaId: string) {
    return tx.despesa.findFirst({ where: { id, republicaId }, include: { rateios: { include: { pagamentos: {include:{comprovante:{select:{pagamentoId:true}}}} } } } })
  }
  contarPagamentos(tx: Prisma.TransactionClient, despesaId: string) {
    return tx.pagamento.count({ where: { rateio: { despesaId } } })
  }
  removerRateios(tx: Prisma.TransactionClient, despesaId: string) { return tx.rateioDespesa.deleteMany({ where: { despesaId } }) }
  editarDespesa(tx: Prisma.TransactionClient, id: string, data: Prisma.DespesaUncheckedUpdateInput) {
    return tx.despesa.update({ where: { id }, data })
  }
  pessoal(tx: Prisma.TransactionClient, usuarioId: string, id?: string, page?:PageInput) {
    return tx.rateioDespesa.findMany({ ...(page?pageArgs(page):{skip:0,take:1}),orderBy:[{despesa:{vencimento:'asc'}},{id:'asc'}],where: { ...(id ? { id } : {}), membro: { usuarioId } }, include: {
      pagamentos: {include:{comprovante:{select:{pagamentoId:true}}}}, despesa: { select: { id: true, titulo: true, categoria: true, vencimento: true,
        republica: { select: { id: true, nome: true } } } },
    } })
  }
  rateioDoUsuario(tx: Prisma.TransactionClient, id: string, usuarioId: string) {
    return tx.rateioDespesa.findFirst({ where: { id, membro: { usuarioId } }, include: { despesa: { include: { republica: true } } } })
  }
  comprovante(tx: Prisma.TransactionClient, id: string) {
    return tx.pagamento.findUnique({ where: { id }, include: { membro: true, rateio: { include: { despesa: { include: { republica: true } } } } } })
  }
  criarDespesa(tx: Prisma.TransactionClient, dados: CriarDespesaInput) {
    const { republicaId, criadaPorId, titulo, categoria, valorTotal, vencimento } = dados
    return tx.despesa.create({ data: { republicaId, criadaPorId, titulo, categoria, valorTotal, vencimento } })
  }

  criarRateios(tx: Prisma.TransactionClient, despesaId: string, parcelas: ParcelaRateio[]) {
    return tx.rateioDespesa.createMany({
      data: parcelas.map(parcela => ({ ...parcela, despesaId })),
    })
  }

  buscarDespesaComRateios(tx: Prisma.TransactionClient, id: string) {
    return tx.despesa.findUniqueOrThrow({
      where: { id }, include: { rateios: { orderBy: { membroId: 'asc' } } },
    })
  }

  buscarRateio(tx: Prisma.TransactionClient, id: string) {
    return tx.rateioDespesa.findUniqueOrThrow({ where: { id } })
  }

  criarPagamento(tx: Prisma.TransactionClient, dados: RegistrarPagamentoInput, valor: Prisma.Decimal) {
    const { rateioId, membroId, comprovanteUrl, chaveIdempotencia, hashRequisicao } = dados
    return tx.pagamento.create({ data: { rateioId, membroId, comprovanteUrl, chaveIdempotencia, hashRequisicao, valor,
      ...(dados.comprovante ? {comprovante:{create:dados.comprovante}} : {}) }, include:{comprovante:{select:{pagamentoId:true}}} })
  }
}
