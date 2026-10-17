import { createHash } from 'node:crypto'
import { Prisma, type Pagamento, type PrismaClient } from '../../gerado/prisma/client.js'
import { executarTransacaoAcid } from '../../infraestrutura/banco/transaction.js'
import { dividirIgualmente } from './dominio/rateio.js'
import { FinanceiroRepository } from './financeiro.repository.js'
import type { CriarDespesaInput, DespesaComRateios, RegistrarPagamentoInput } from './financeiro.types.js'
import { withActor, republicContext, requireAdmin, type Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'

const repository = new FinanceiroRepository()

async function validarSelecao(tx: Prisma.TransactionClient, republicaId: string, ids: readonly string[]) {
  const count = await repository.contarMembros(tx, republicaId, ids)
  if (!ids.length || new Set(ids).size !== ids.length || count !== ids.length) {
    throw new AppError(400, 'INVALID_MEMBERS', 'Selecione membros ativos da própria república, sem repetições.')
  }
}

function parcelasValidas(valor: string, membros: readonly string[]) {
  try { return dividirIgualmente(valor, membros) } catch {
    throw new AppError(400, 'INVALID_SPLIT', 'O valor deve permitir ao menos um centavo para cada membro selecionado.')
  }
}

export function criarDespesaComRateio(prisma: PrismaClient, dados: CriarDespesaInput): Promise<DespesaComRateios> {
  const parcelas = dividirIgualmente(dados.valorTotal, dados.membroIds)
  return executarTransacaoAcid(prisma, async tx => {
    const despesa = await repository.criarDespesa(tx, dados)
    await repository.criarRateios(tx, despesa.id, parcelas)
    return repository.buscarDespesaComRateios(tx, despesa.id)
  })
}

export function registrarPagamento(prisma: PrismaClient, dados: RegistrarPagamentoInput): Promise<Pagamento> {
  return executarTransacaoAcid(prisma, tx => pagar(tx, dados))
}

async function pagar(tx: Prisma.TransactionClient, dados: RegistrarPagamentoInput): Promise<Pagamento> {
  if (dados.chaveIdempotencia) {
    const previous = await repository.pagamentoPorChave(tx, dados.chaveIdempotencia)
    if (previous) {
      if (previous.membroId !== dados.membroId || previous.hashRequisicao !== dados.hashRequisicao) {
        throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'A chave já foi usada com outros dados.')
      }
      return previous
    }
  }
  const rateio = await repository.buscarRateio(tx, dados.rateioId)
  const value = dados.valor ? new Prisma.Decimal(dados.valor) : rateio.valorDevido.minus(rateio.valorPago)
  if (value.lessThanOrEqualTo(0) || value.greaterThan(rateio.valorDevido.minus(rateio.valorPago))) {
    throw new AppError(409, 'PAYMENT_EXCEEDS_BALANCE', 'O pagamento precisa ser positivo e não pode ultrapassar o saldo.')
  }
  return repository.criarPagamento(tx, dados, value)
}

export function createFinanceiroService(db: PrismaClient) {
  return {
    create: (actor: Actor, input: Omit<CriarDespesaInput, 'republicaId' | 'criadaPorId'>, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      requireAdmin(user, republic)
      const data = { ...input, republicaId: republic.id, criadaPorId: user.id }
      await validarSelecao(tx, republic.id, input.membroIds)
      const parcelas = parcelasValidas(input.valorTotal, input.membroIds)
      const expense = await repository.criarDespesa(tx, data)
      await repository.criarRateios(tx, expense.id, parcelas)
      return repository.buscarDespesaComRateios(tx, expense.id)
    }),
    list: (actor: Actor, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      return repository.listarDespesas(tx, republic.id)
    }),
    detail: (actor: Actor, id: string, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      const expense = await repository.detalharDespesa(tx, id, republic.id)
      if (!expense) throw new AppError(404, 'NOT_FOUND', 'Despesa não encontrada.')
      return expense
    }),
    edit: (actor: Actor, id: string, input: Partial<Omit<CriarDespesaInput, 'republicaId' | 'criadaPorId'>>, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      requireAdmin(user, republic)
      const expense = await repository.detalharDespesa(tx, id, republic.id)
      if (!expense) throw new AppError(404, 'NOT_FOUND', 'Despesa não encontrada.')
      const { membroIds, valorTotal, ...metadata } = input
      if (membroIds || valorTotal) {
        if (await repository.contarPagamentos(tx, id)) {
          throw new AppError(409, 'FINANCIAL_HISTORY_LOCKED', 'Valor e participantes não mudam após o primeiro pagamento.')
        }
        const value = valorTotal ?? expense.valorTotal.toFixed(2)
        const members = membroIds ?? expense.rateios.map(item => item.membroId)
        await validarSelecao(tx, republic.id, members)
        const parcelas = parcelasValidas(value, members)
        await repository.removerRateios(tx, id)
        await repository.editarDespesa(tx, id, { valorTotal: value })
        await repository.criarRateios(tx, id, parcelas)
      }
      await repository.editarDespesa(tx, id, metadata)
      return repository.buscarDespesaComRateios(tx, id)
    }),
    personal: (actor: Actor, id?: string) => withActor(db, actor, async (tx, user) => {
      // Este escopo é por proprietário, sem exigir vínculo ativo na república antiga.
      const items = await repository.pessoal(tx, user.id, id)
      if (id && !items.length) throw new AppError(404, 'NOT_FOUND', 'Rateio não encontrado.')
      return id ? items[0] : items
    }),
    async pay(actor: Actor, input: { rateioId: string; valor: string; chaveIdempotencia: string; comprovanteUrl?: string; arquivoHash?: string }) {
      const hashRequisicao = createHash('sha256').update(JSON.stringify([
        actor.id, input.rateioId, new Prisma.Decimal(input.valor).toFixed(2), input.arquivoHash ?? null,
      ])).digest('hex')
      const operation = () => withActor(db, actor, async (tx, user) => {
        const rateio = await repository.rateioDoUsuario(tx, input.rateioId, user.id)
        if (!rateio) throw new AppError(404, 'NOT_FOUND', 'Rateio não encontrado.')
        if (!rateio.despesa.republica.ativa) throw new AppError(403, 'REPUBLIC_BLOCKED', 'A república está bloqueada.')
        return pagar(tx, { ...input, membroId: rateio.membroId, hashRequisicao })
      })
      try { return await operation() } catch (error) {
        // Uma colisão na chave após disputa não deve produzir um segundo pagamento.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return operation()
        throw error
      }
    },
    receipt: (actor: Actor, id: string) => withActor(db, actor, async (tx, user) => {
      const payment = await repository.comprovante(tx, id)
      if (!payment?.comprovanteUrl) throw new AppError(404, 'NOT_FOUND', 'Comprovante não encontrado.')
      const republic = payment.rateio.despesa.republica
      const own = payment.membro.usuarioId === user.id
      const admin = republic.adminId === user.id && user.tipoUsuario === 'USUARIO_ADMIN'
      if (!own && !admin && user.tipoUsuario !== 'USUARIO_MASTER') throw new AppError(404, 'NOT_FOUND', 'Comprovante não encontrado.')
      return payment.comprovanteUrl
    }),
  }
}
export type FinanceiroService = ReturnType<typeof createFinanceiroService>
