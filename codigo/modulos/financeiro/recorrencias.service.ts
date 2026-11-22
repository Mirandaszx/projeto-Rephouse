import { createHash } from 'node:crypto'
import { Prisma, type PrismaClient } from '../../gerado/prisma/client.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { withActor, republicContext, requireAdmin, type Actor } from '../../compartilhado/context.js'
import { executarTransacaoAcid } from '../../infraestrutura/banco/transaction.js'
import { pageArgs, pageResult, type PageInput } from '../../compartilhado/http/pagination.js'
import { civilDate } from '../../configuracao/time-zone.js'
import { dividirIgualmente } from './dominio/rateio.js'
import { monthDate, nextMonth, dueDate } from './dominio/competencia.js'
import { recurringInclude, recurringPublic, RecorrenciasRepository } from './recorrencias.repository.js'
import { FinanceiroRepository } from './financeiro.repository.js'

export interface RecurringInput { titulo: string; categoria: string; valorTotal: string; diaVencimento: number; inicio: string; fim?: string | null; membroIds: string[]; despesaOrigemId?: string }
export type RecurringEdit = Partial<Pick<RecurringInput, 'titulo' | 'categoria' | 'valorTotal' | 'diaVencimento' | 'membroIds' | 'fim'>> & { ativa?: boolean }
const repository = new RecorrenciasRepository()
const financial = new FinanceiroRepository()
const occurrenceKey = (id: string, competencia: Date) => ({ recorrenciaId_competencia: { recorrenciaId: id, competencia } })

async function selection(tx: Prisma.TransactionClient, republicaId: string, ids: string[], value: string) {
  if (!ids.length || new Set(ids).size !== ids.length || await repository.activeMembers(tx, republicaId, ids) !== ids.length) {
    throw new AppError(400, 'INVALID_MEMBERS', 'Selecione moradores ativos da própria república, sem repetições.')
  }
  try { dividirIgualmente(value, ids) } catch { throw new AppError(400, 'INVALID_SPLIT', 'O valor deve permitir ao menos um centavo por participante.') }
}

// Uma competência por transação: falhar em uma conta não desfaz as outras contas do lote.
export async function materializeRecurring(tx: Prisma.TransactionClient, id: string, today: string) {
  const recurring = await repository.lock(tx, id)
  const current = today.slice(0, 7)
  if (!recurring || !recurring.ativa || recurring.pausaMotivo || recurring.proximaCompetencia > monthDate(current)) return false
  const competencia = recurring.proximaCompetencia
  const month = competencia.toISOString().slice(0, 7)
  const config = recurring.configuracoes.find(item => item.vigencia <= competencia)
  // O limite considera o vencimento ajustado ao último dia válido do mês,
  // inclusive nos meses não gerados durante uma interrupção da API.
  if (recurring.fim && (competencia > recurring.fim || (config && dueDate(month, config.diaVencimento) > recurring.fim))) {
    await tx.recorrenciaDespesa.update({ where: { id }, data: { ativa: false } })
    return true
  }
  const existing = await tx.competenciaRecorrencia.findUnique({ where: occurrenceKey(id, competencia) })
  if (!existing) {
    const snapshot = config ? { titulo: config.titulo, categoria: config.categoria, valorTotal: config.valorTotal.toFixed(2),
      diaVencimento: config.diaVencimento, membroIds: config.participantes.map(item => item.membroId),
      fim: recurring.fim?.toISOString().slice(0, 10) ?? null } : undefined
    if (month < current) {
      await tx.competenciaRecorrencia.create({ data: { recorrenciaId: id, competencia, configuracaoId: config?.id,
        estado: 'PENDENTE_REVISAO', motivo: 'PERIODO_NAO_GERADO', snapshot } })
    } else {
      const house = await tx.republica.findUniqueOrThrow({ where: { id: recurring.republicaId }, include: { administrador: true } })
      const ids = config?.participantes.map(item => item.membroId) ?? []
      const admin = house.administrador
      const adminMember = await tx.membroRepublica.count({ where: { republicaId: house.id, usuarioId: admin.id, ativo: true } })
      const validAdmin = house.ativa && admin.ativo && !admin.excluidoEm && adminMember === 1 && ['USUARIO_ADMIN', 'USUARIO_MASTER'].includes(admin.tipoUsuario)
      const validMembers = ids.length > 0 && await repository.activeMembers(tx, house.id, ids) === ids.length
      if (!config || !validAdmin || !validMembers) {
        const motivo = !validAdmin ? 'REPUBLICA_OU_ADMIN_INATIVO' : 'PARTICIPANTES_INATIVOS'
        await tx.competenciaRecorrencia.create({ data: { recorrenciaId: id, competencia, configuracaoId: config?.id, estado: 'BLOQUEADA', motivo, snapshot } })
        await tx.recorrenciaDespesa.update({ where: { id }, data: { pausaMotivo: motivo, proximaCompetencia: monthDate(nextMonth(month)) } })
        return true
      }
      const expense = await financial.criarDespesa(tx, { republicaId: house.id, criadaPorId: admin.id,
        titulo: config.titulo, categoria: config.categoria, valorTotal: config.valorTotal.toFixed(2), vencimento: dueDate(month, config.diaVencimento), membroIds: ids })
      await financial.criarRateios(tx, expense.id, dividirIgualmente(config.valorTotal.toFixed(2), ids))
      await tx.competenciaRecorrencia.create({ data: { recorrenciaId: id, competencia, configuracaoId: config.id,
        estado: 'GERADA', despesaId: expense.id, snapshot } })
    }
  }
  await tx.recorrenciaDespesa.update({ where: { id }, data: { proximaCompetencia: monthDate(nextMonth(month)) } })
  return true
}

export function createRecorrenciasService(db: PrismaClient, clock: () => string = civilDate) {
  async function authorized(tx: Prisma.TransactionClient, actor: Parameters<typeof requireAdmin>[0], id: string, scope?: string) {
    const house = await republicContext(tx, actor, scope)
    const recurring = await tx.recorrenciaDespesa.findFirst({ where: { id, republicaId: house.id }, include: recurringInclude })
    if (!recurring) throw new AppError(404, 'NOT_FOUND', 'Recorrência não encontrada.')
    return { house, recurring }
  }
  return {
    list: (actor: Actor, page: PageInput, scope?: string) => withActor(db, actor, async (tx, user) => {
      const house = await republicContext(tx, user, scope)
      const where = { republicaId: house.id }
      const items = await tx.recorrenciaDespesa.findMany({ where, ...pageArgs(page), include: recurringInclude, orderBy: [{ criadaEm: 'desc' }, { id: 'asc' }] })
      return pageResult(items.map(recurringPublic), await tx.recorrenciaDespesa.count({ where }), page)
    }),
    detail: (actor: Actor, id: string, scope?: string) => withActor(db, actor, async (tx, user) => recurringPublic((await authorized(tx, user, id, scope)).recurring)),
    async create(actor: Actor, input: RecurringInput, key: string, scope?: string) {
      const hash = createHash('sha256').update(JSON.stringify({ titulo: input.titulo, categoria: input.categoria, valorTotal: new Prisma.Decimal(input.valorTotal).toFixed(2),
        diaVencimento: input.diaVencimento, inicio: input.inicio, membroIds: [...input.membroIds].sort(), despesaOrigemId: input.despesaOrigemId ?? null, actor: actor.id, scope: scope ?? null,
        ...(input.fim != null ? { fim: input.fim } : {}) })).digest('hex')
      const operation = () => withActor(db, actor, async (tx, user) => {
        const house = await republicContext(tx, user, scope)
        requireAdmin(user, house)
        const previous = await repository.byKey(tx, key)
        if (previous) {
          if (previous.criadaPorId !== user.id || previous.republicaId !== house.id || previous.hashRequisicao !== hash) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'A chave já foi usada com outros dados.')
          return recurringPublic(previous)
        }
        const today = clock(), current = today.slice(0, 7)
        if (input.inicio < current) throw new AppError(400, 'INVALID_START', 'Escolha o mês atual ou um mês futuro.')
        if (input.fim && input.fim < dueDate(input.inicio, input.diaVencimento).toISOString().slice(0, 10)) {
          throw new AppError(400, 'INVALID_END', 'A data de término deve incluir o primeiro vencimento da recorrência.')
        }
        if (input.despesaOrigemId) {
          const origin = await tx.despesa.findFirst({ where: { id: input.despesaOrigemId, republicaId: house.id }, include: { competenciaRecorrente: true, recorrenciaOriginada: true } })
          if (!origin) throw new AppError(404, 'NOT_FOUND', 'Despesa não encontrada.')
          if (origin.competenciaRecorrente || origin.recorrenciaOriginada) throw new AppError(409, 'ALREADY_RECURRING', 'A despesa já está vinculada a uma recorrência.')
          if (input.inicio < nextMonth(current) || input.inicio <= origin.vencimento.toISOString().slice(0, 7)) throw new AppError(400, 'INVALID_START', 'As repetições começam após o mês atual e o mês da despesa original.')
        }
        if (input.inicio === current && dueDate(current, input.diaVencimento).toISOString().slice(0, 10) < today) throw new AppError(400, 'INVALID_START', 'Este vencimento já passou. Comece no próximo mês.')
        await selection(tx, house.id, input.membroIds, input.valorTotal)
        const recurring = await tx.recorrenciaDespesa.create({ data: { republicaId: house.id, criadaPorId: user.id,
          despesaOrigemId: input.despesaOrigemId, inicio: monthDate(input.inicio), fim: input.fim ? new Date(`${input.fim}T00:00:00Z`) : null,
          proximaCompetencia: monthDate(input.inicio),
          chaveIdempotencia: key, hashRequisicao: hash, configuracoes: { create: { titulo: input.titulo, categoria: input.categoria,
            valorTotal: input.valorTotal, diaVencimento: input.diaVencimento, vigencia: monthDate(input.inicio),
            participantes: { create: input.membroIds.map(membroId => ({ membroId })) } } } } })
        await materializeRecurring(tx, recurring.id, today)
        return recurringPublic((await repository.lock(tx, recurring.id))!)
      })
      try { return await operation() } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return operation()
        throw error
      }
    },
    edit: (actor: Actor, id: string, input: RecurringEdit, scope?: string) => withActor(db, actor, async (tx, user) => {
      const { house } = await authorized(tx, user, id, scope)
      requireAdmin(user, house)
      const recurring = (await repository.lock(tx, id))!
      const latest = recurring.configuracoes[0]!
      const { ativa, fim, ...changes } = input
      if (fim && fim < recurring.inicio.toISOString().slice(0, 10)) {
        throw new AppError(400, 'INVALID_END', 'A data de término não pode ser anterior ao início da recorrência.')
      }
      if (Object.keys(changes).length || ativa === true) {
        const ids = changes.membroIds ?? latest.participantes.map(person => person.membroId)
        const value = changes.valorTotal ?? latest.valorTotal.toFixed(2)
        await selection(tx, house.id, ids, value)
        const vigencia = monthDate(nextMonth(clock().slice(0, 7)))
        await tx.configuracaoRecorrencia.create({ data: { recorrenciaId: id, vigencia: vigencia < recurring.inicio ? recurring.inicio : vigencia,
          titulo: changes.titulo ?? latest.titulo, categoria: changes.categoria ?? latest.categoria, valorTotal: value,
          diaVencimento: changes.diaVencimento ?? latest.diaVencimento, participantes: { create: ids.map(membroId => ({ membroId })) } } })
      }
      await tx.recorrenciaDespesa.update({ where: { id }, data: { ...(ativa !== undefined ? { ativa } : {}),
        ...(fim !== undefined ? { fim: fim ? new Date(`${fim}T00:00:00Z`) : null } : {}),
        ...(ativa === true ? { pausaMotivo: null } : {}) } })
      return recurringPublic((await repository.lock(tx, id))!)
    }),
    occurrences: (actor: Actor, id: string, page: PageInput, scope?: string) => withActor(db, actor, async (tx, user) => {
      await authorized(tx, user, id, scope)
      const where = { recorrenciaId: id }
      const items = await tx.competenciaRecorrencia.findMany({ where, ...pageArgs(page), orderBy: { competencia: 'desc' },
        select: { competencia: true, estado: true, motivo: true, despesaId: true, revisadaEm: true } })
      return pageResult(items.map(item => ({ ...item, competencia: item.competencia.toISOString().slice(0, 7) })), await tx.competenciaRecorrencia.count({ where }), page)
    }),
    review: (actor: Actor, id: string, month: string, scope?: string) => withActor(db, actor, async (tx, user) => {
      const { house } = await authorized(tx, user, id, scope)
      requireAdmin(user, house)
      await repository.lock(tx, id)
      const where = occurrenceKey(id, monthDate(month))
      const item = await tx.competenciaRecorrencia.findUnique({ where })
      if (!item) throw new AppError(404, 'NOT_FOUND', 'Competência não encontrada.')
      if (item.estado === 'GERADA') throw new AppError(409, 'ALREADY_GENERATED', 'Esta competência já possui uma despesa.')
      if (item.estado !== 'REVISADA') await tx.competenciaRecorrencia.update({ where, data: { estado: 'REVISADA', revisadaPorId: user.id, revisadaEm: new Date() } })
    }),
  }
}

export async function processRecurringBatch(db: PrismaClient, today = civilDate(), log: (value: Record<string, unknown>) => void = () => {}) {
  const items = await db.recorrenciaDespesa.findMany({ where: { ativa: true, pausaMotivo: null, proximaCompetencia: { lte: monthDate(today.slice(0, 7)) } },
    orderBy: [{ proximaCompetencia: 'asc' }, { id: 'asc' }], take: 50, select: { id: true } })
  for (const item of items) {
    try { await executarTransacaoAcid(db, tx => materializeRecurring(tx, item.id, today)) }
    catch { log({ event: 'recurrence_failed', code: 'RECURRENCE_PROCESSING_FAILED', recorrenciaId: item.id }) }
  }
}

export function startRecurringScheduler(db: PrismaClient, log: (value: Record<string, unknown>) => void) {
  let running: Promise<void> | undefined, stopped = false
  const run = () => {
    if (stopped || running) return
    running = processRecurringBatch(db, civilDate(), log).catch(() => { log({ event: 'recurrence_failed', code: 'RECURRENCE_SCAN_FAILED' }) }).finally(() => { running = undefined })
  }
  const timer = setInterval(run, 60_000)
  timer.unref()
  run()
  return async () => { stopped = true; clearInterval(timer); await running }
}
