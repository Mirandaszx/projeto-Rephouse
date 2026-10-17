import type { Prisma } from '../../gerado/prisma/client.js'
import type { ParcelaRateio } from './dominio/rateio.js'
import type { CriarDespesaInput, RegistrarPagamentoInput } from './financeiro.types.js'

// Recebe a transação do service; não cria conexão nem abre transação própria.
export class FinanceiroRepository {
  contarMembros(tx: Prisma.TransactionClient, republicaId: string, ids: readonly string[]) {
    return tx.membroRepublica.count({ where: { id: { in: [...ids] }, republicaId, ativo: true, usuario: { ativo: true, excluidoEm: null } } })
  }
  pagamentoPorChave(tx: Prisma.TransactionClient, chaveIdempotencia: string) {
    return tx.pagamento.findUnique({ where: { chaveIdempotencia } })
  }
  listarDespesas(tx: Prisma.TransactionClient, republicaId: string) {
    return tx.despesa.findMany({ where: { republicaId }, include: { rateios: true }, orderBy: { vencimento: 'asc' } })
  }
  detalharDespesa(tx: Prisma.TransactionClient, id: string, republicaId: string) {
    return tx.despesa.findFirst({ where: { id, republicaId }, include: { rateios: { include: { pagamentos: true } } } })
  }
  contarPagamentos(tx: Prisma.TransactionClient, despesaId: string) {
    return tx.pagamento.count({ where: { rateio: { despesaId } } })
  }
  removerRateios(tx: Prisma.TransactionClient, despesaId: string) { return tx.rateioDespesa.deleteMany({ where: { despesaId } }) }
  editarDespesa(tx: Prisma.TransactionClient, id: string, data: Prisma.DespesaUncheckedUpdateInput) {
    return tx.despesa.update({ where: { id }, data })
  }
  pessoal(tx: Prisma.TransactionClient, usuarioId: string, id?: string) {
    return tx.rateioDespesa.findMany({ where: { ...(id ? { id } : {}), membro: { usuarioId } }, include: {
      pagamentos: true, despesa: { select: { id: true, titulo: true, categoria: true, vencimento: true,
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
    return tx.pagamento.create({ data: { rateioId, membroId, comprovanteUrl, chaveIdempotencia, hashRequisicao, valor } })
  }
}
