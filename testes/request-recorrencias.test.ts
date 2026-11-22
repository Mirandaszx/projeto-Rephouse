import 'dotenv/config'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { contextoCasa, multipart, type Expense, type Page, type Schemas } from './auxiliares/request-spec.js'
import { iniciarApiCompilada, httpProcesso, aguardar } from './auxiliares/processo-api.js'
import { createRecorrenciasService, processRecurringBatch } from '../codigo/modulos/financeiro/recorrencias.service.js'
import { abrirSchemaAuditoria, registros } from './auxiliares/schema.js'
import { readFile } from 'node:fs/promises'

// Datas esperadas calculadas aqui, sem chamar as funções de calendário da aplicação.
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
function month(offset = 0) { const date = new Date(today().slice(0, 7) + '-01T00:00:00Z'); date.setUTCMonth(date.getUTCMonth() + offset); return date.toISOString().slice(0, 7) }
const config = (ids: string[], inicio = month()) => ({ titulo: 'Conta mensal HTTP', categoria: 'Casa', valorTotal: '100.00', diaVencimento: 31, inicio, membroIds: ids })
type Occurrence = { competencia: string; estado: string; despesaId: string | null; motivo: string | null }

describe('Data limite da recorrência', () => {
  it('quando informa o término por HTTP, então persiste o limite, mantém idempotência e aceita os adaptadores', async () => {
    const c = await contextoCasa()
    try {
      const start = month(1), fim = `${month(3)}-15`, key = randomUUID()
      const input = { ...config([c.anaMember.id], start), fim }
      const [a, b] = await Promise.all([1, 2].map(() => c.request<Schemas['Recorrencia']>('POST', '/api/recorrencias', c.admin.token, input, key)))
      assert.equal(a!.status, 201); assert.equal(b!.status, 201); assert.equal(a!.body.id, b!.body.id); assert.equal(a!.body.fim, fim)
      assert.equal((await c.request('POST', '/api/recorrencias', c.admin.token, { ...input, fim: `${month(3)}-20` }, key)).status, 409)
      assert.equal(await c.db.recorrenciaDespesa.count(), 1); assert.equal(await c.db.despesa.count(), 0)
      assert.equal((await c.db.recorrenciaDespesa.findUniqueOrThrow({ where: { id: a!.body.id } })).fim!.toISOString().slice(0, 10), fim)
      const front = await c.request<Schemas['Recorrencia']>('POST', '/api/front/v1/recorrencias', c.admin.token, input, randomUUID())
      assert.equal(front.status, 201); assert.equal(front.body.fim, fim)
      const master = await c.request<Schemas['Recorrencia']>('POST', `/api/master/republicas/${c.house.id}/recorrencias`, c.master.token, input, randomUUID())
      assert.equal(master.status, 201); assert.equal(master.body.fim, fim)
      assert.equal((await c.request('PATCH', `/api/recorrencias/${a!.body.id}`, c.ana.token, { fim: null })).status, 403)
      assert.equal((await c.request('PATCH', `/api/recorrencias/${a!.body.id}`, c.other.token, { fim: null })).status, 404)
      const unlimitedKey = randomUUID(), unlimited = config([c.anaMember.id], start)
      const original = await c.request<Schemas['Recorrencia']>('POST', '/api/recorrencias', c.admin.token, unlimited, unlimitedKey)
      const replay = await c.request<Schemas['Recorrencia']>('POST', '/api/recorrencias', c.admin.token, { ...unlimited, fim: null }, unlimitedKey)
      assert.equal(original.status, 201); assert.equal(original.body.fim, null); assert.equal(replay.status, 201); assert.equal(replay.body.id, original.body.id)
    } finally { await c.close() }
  })
  it('quando a data é inválida ou exclui o primeiro vencimento, então responde 400 sem gravar', async () => {
    const c = await contextoCasa()
    try {
      const input = config([c.anaMember.id], month(1))
      for (const fim of ['', '2028-02-30', '2026-13-01', '31/12/2030', '2200-01-01', `${month(1)}-01`, `${month()}-28`]) {
        const result = await c.request('POST', '/api/recorrencias', c.admin.token, { ...input, fim }, randomUUID())
        assert.equal(result.status, 400, fim); assert.ok(['VALIDATION_ERROR', 'INVALID_END'].includes(result.body.error.code))
      }
      assert.equal(await c.db.recorrenciaDespesa.count(), 0); assert.equal(await c.db.despesa.count(), 0); assert.equal(await c.db.competenciaRecorrencia.count(), 0)
    } finally { await c.close() }
  })
  it('quando altera ou remove somente o término, então mantém configurações, despesas e pagamentos anteriores', async () => {
    const c = await contextoCasa()
    try {
      const created = await c.request<Schemas['Recorrencia']>('POST', '/api/recorrencias', c.admin.token, config([c.anaMember.id]), randomUUID())
      const id = created.body.id, before = await c.db.despesa.findMany({ include: { rateios: true } })
      const bill = before[0]!, share = bill.rateios[0]!
      assert.equal((await c.request('POST', '/api/pagamentos', c.ana.token, multipart(share.id), randomUUID())).status, 201)
      const paid = await c.db.despesa.findMany({ include: { rateios: { include: { pagamentos: { include: { comprovante: true } } } } } })
      const path = `/api/recorrencias/${id}`, fim = `${month(2)}-15`
      const edited = await c.request<Schemas['Recorrencia']>('PATCH', path, c.admin.token, { fim })
      assert.equal(edited.status, 200); assert.equal(edited.body.fim, fim); assert.equal(edited.body.configuracoes.length, 1)
      assert.equal((await c.request<Schemas['Recorrencia']>('PATCH', path, c.admin.token, { titulo: 'Novo título' })).body.fim, fim)
      assert.equal((await c.request('PATCH', path, c.admin.token, { fim: `${month(-1)}-01` })).status, 400)
      const cleared = await c.request<Schemas['Recorrencia']>('PATCH', path, c.admin.token, { fim: null })
      assert.equal(cleared.status, 200); assert.equal(cleared.body.fim, null)
      assert.deepEqual(await c.db.despesa.findMany({ include: { rateios: { include: { pagamentos: { include: { comprovante: true } } } } } }), paid)
    } finally { await c.close() }
  })
  it('quando o vencimento coincide com o término, então inclui a última conta e não gera depois, inclusive em fevereiro e dezembro', async () => {
    const c = await contextoCasa()
    try {
      const service = createRecorrenciasService(c.db, () => '2028-01-01'), actor = { id: c.admin.usuario.id, versaoToken: 0 }
      for (const [inicio, fim] of [['2028-02', '2028-02-29'], ['2029-02', '2029-02-28'], ['2028-12', '2028-12-31']] as const) {
        const recurring = await service.create(actor, { ...config([c.anaMember.id], inicio), fim }, randomUUID())
        await processRecurringBatch(c.db, `${inicio}-01`)
        const occurrences = await c.db.competenciaRecorrencia.findMany({ where: { recorrenciaId: recurring.id }, include: { despesa: true } })
        assert.equal(occurrences.length, 1); assert.equal(occurrences[0]!.despesa!.vencimento.toISOString().slice(0, 10), fim)
        const later = new Date(`${inicio}-01T00:00:00Z`); later.setUTCMonth(later.getUTCMonth() + 1)
        await Promise.all([processRecurringBatch(c.db, later.toISOString().slice(0, 10)), processRecurringBatch(c.db, later.toISOString().slice(0, 10))])
        assert.equal(await c.db.competenciaRecorrencia.count({ where: { recorrenciaId: recurring.id } }), 1)
        assert.equal((await c.db.recorrenciaDespesa.findUniqueOrThrow({ where: { id: recurring.id } })).ativa, false)
      }
    } finally { await c.close() }
  })
  it('quando retorna após o término, então revisa só meses elegíveis e não gera cobranças posteriores', async () => {
    const c = await contextoCasa()
    const processes: Awaited<ReturnType<typeof iniciarApiCompilada>>[] = []
    try {
      const recurring = await prepararGeracao(c, [c.anaMember.id], month(-1))
      await c.db.recorrenciaDespesa.update({ where: { id: recurring.id }, data: { fim: new Date(`${month()}-15T00:00:00Z`) } })
      let api = await iniciarApiCompilada(c.schema); processes.push(api)
      const path = `/api/recorrencias/${recurring.id}/competencias`
      const past = await aguardar(() => httpProcesso<Page<Occurrence>>(api.base, 'GET', path, c.admin.token), response => response.body.dados.length === 1)
      assert.equal(past.body.dados[0]!.estado, 'PENDENTE_REVISAO')
      await api.stop(); processes.length = 0
      api = await iniciarApiCompilada(c.schema); processes.push(api)
      await aguardar(() => httpProcesso<Schemas['Recorrencia']>(api.base, 'GET', `/api/recorrencias/${recurring.id}`, c.admin.token), response => !response.body.ativa)
      assert.equal(await c.db.despesa.count(), 0); assert.equal(await c.db.competenciaRecorrencia.count(), 1)
      assert.equal((await httpProcesso<Page<Occurrence>>(api.base, 'GET', path, c.admin.token)).body.dados.length, 1)
    } finally { try { await Promise.all(processes.map(api => api.stop())) } finally { await c.close() } }
  })
  it('quando migra e reverte uma base anterior, então preserva todos os registros e impede descartar limites em uso', async () => {
    const c = await abrirSchemaAuditoria()
    const down = await readFile('prisma/migracoes/202611220001_recorrencia_data_fim/down.sql', 'utf8')
    const up = await readFile('prisma/migracoes/202611220001_recorrencia_data_fim/migration.sql', 'utf8')
    try {
      await c.db.query(down)
      const before = await registros(c.db)
      await c.db.query(up)
      const projected = (await c.db.query("SELECT to_jsonb(t)-'fim' linha FROM recorrencias_despesa t ORDER BY to_jsonb(t)::text")).rows
      assert.deepEqual(projected, before.recorrencias_despesa)
      const after = await registros(c.db)
      for (const table of Object.keys(before).filter(table => table !== 'recorrencias_despesa')) assert.deepEqual(after[table], before[table], table)
      assert.equal((await c.db.query('SELECT fim FROM recorrencias_despesa')).rows[0].fim, null)
      for (const invalid of ['2029-12-31', 'infinity', '2200-01-01']) {
        await assert.rejects(c.db.query('UPDATE recorrencias_despesa SET fim=$1 WHERE id=$2', [invalid, c.ids.recorrencia]), (error: unknown) => !!error && typeof error === 'object' && 'code' in error && error.code === '23514')
      }
      await c.db.query("UPDATE recorrencias_despesa SET fim='2030-02-28' WHERE id=$1", [c.ids.recorrencia])
      const limited = await registros(c.db)
      await assert.rejects(c.db.query(down)); await c.db.query('ROLLBACK')
      assert.deepEqual(await registros(c.db), limited)
    } finally { await c.close() }
  })
})

describe('Recorrências configuradas por HTTP', () => {
  it('quando a criação atual é simultânea ou repetida, então existe uma recorrência e uma despesa com centavos exatos', async () => {
    const c = await contextoCasa()
    try {
      const key = randomUUID(), input = config([c.own.id, c.anaMember.id, c.brunoMember.id])
      const [a, b] = await Promise.all([1, 2].map(() => c.request<Schemas['Recorrencia']>('POST', '/api/recorrencias', c.admin.token, input, key)))
      assert.equal(a!.status, 201); assert.equal(b!.status, 201); assert.equal(a!.body.id, b!.body.id)
      const replay = await c.request<Schemas['Recorrencia']>('POST', '/api/recorrencias', c.admin.token, input, key)
      assert.equal(replay.body.id, a!.body.id)
      assert.equal((await c.request('POST', '/api/recorrencias', c.admin.token, { ...input, valorTotal: '120.00' }, key)).status, 409)
      assert.equal(await c.db.recorrenciaDespesa.count(), 1); assert.equal(await c.db.despesa.count(), 1)
      const occurrence = (await c.request<Page<Occurrence>>('GET', `/api/recorrencias/${a!.body.id}/competencias`, c.admin.token)).body.dados[0]!
      const bill = (await c.request<Expense>('GET', `/api/despesas/${occurrence.despesaId}`, c.admin.token)).body
      assert.deepEqual(bill.rateios.map(share => share.valorDevido).sort(), ['33.33', '33.33', '33.34'])
      assert.equal(bill.recorrencia?.id, a!.body.id)
    } finally { await c.close() }
  })
  it('quando edita ou desativa a recorrência, então preserva a conta já gerada', async () => {
    const c = await contextoCasa()
    try {
      const recurring = (await c.request<Schemas['Recorrencia']>('POST', '/api/recorrencias', c.admin.token, config([c.anaMember.id]), randomUUID())).body
      const occurrences = (await c.request<Page<Occurrence>>('GET', `/api/recorrencias/${recurring.id}/competencias`, c.admin.token)).body
      const path = `/api/despesas/${occurrences.dados[0]!.despesaId}`, before = (await c.request<Expense>('GET', path, c.admin.token)).body
      const edited = await c.request<Schemas['Recorrencia']>('PATCH', `/api/recorrencias/${recurring.id}`, c.admin.token, { valorTotal: '120.00', ativa: false })
      assert.equal(edited.status, 200)
      assert.equal(edited.body.ativa, false); assert.equal(edited.body.configuracoes[0]!.vigencia, month(1))
      assert.equal(edited.body.configuracoes[0]!.valorTotal, '120.00')
      assert.deepEqual((await c.request<Expense>('GET', path, c.admin.token)).body, before)
      assert.equal((await c.request('PATCH', `/api/recorrencias/${recurring.id}`, c.ana.token, { ativa: true })).status, 403)
      assert.equal((await c.request('GET', `/api/recorrencias/${recurring.id}`, c.other.token)).status, 404)
      assert.equal((await c.request('POST', `/api/recorrencias/${recurring.id}/competencias/${month()}/revisar`, c.admin.token, {})).status, 409)
    } finally { await c.close() }
  })
  it('quando o início é futuro, então não antecipa cobrança; quando é passado ou inválido, então rejeita', async () => {
    const c = await contextoCasa()
    try {
      assert.equal((await c.request('POST', '/api/recorrencias', c.admin.token, config([c.anaMember.id], month(1)), randomUUID())).status, 201)
      assert.equal(await c.db.despesa.count(), 0)
      const variants = [{ ...config([c.anaMember.id]), inicio: month(-1) }, { ...config([c.anaMember.id]), diaVencimento: 0 },
        { ...config([c.anaMember.id]), diaVencimento: 32 }, config([c.foreign.id]), config([])]
      for (const input of variants) assert.equal((await c.request('POST', '/api/recorrencias', c.admin.token, input, randomUUID())).status, 400)
      // Em todo dia posterior ao primeiro existe vencimento passado no mês real.
      if (Number(today().slice(-2)) > 1) assert.equal((await c.request('POST', '/api/recorrencias', c.admin.token, { ...config([c.anaMember.id]), diaVencimento: 1 }, randomUUID())).status, 400)
      assert.equal(await c.db.recorrenciaDespesa.count(), 1)
    } finally { await c.close() }
  })
  it('quando vincula uma conta avulsa a repetições futuras, então não duplica a conta original', async () => {
    const c = await contextoCasa()
    try {
      const original = await c.expense(c.admin, [c.anaMember.id], { vencimento: today() })
      const input = { ...config([c.anaMember.id], month(1)), despesaOrigemId: original.id }
      assert.equal((await c.request('POST', '/api/recorrencias', c.admin.token, input, randomUUID())).status, 201)
      assert.equal((await c.request('POST', '/api/recorrencias', c.admin.token, input, randomUUID())).status, 409)
      assert.equal(await c.db.despesa.count(), 1); assert.equal(await c.db.competenciaRecorrencia.count(), 0)
    } finally { await c.close() }
  })
})

describe('Resumo individual, vencimentos e compatibilidade', () => {
  it('quando filtra o mês de vencimento, então considera pagamentos de outros meses e distingue casa de parcela própria', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id, c.brunoMember.id], { valorTotal: '120.00', vencimento: `${month(-1)}-15` })
      const own = bill.rateios.find(share => share.membroId === c.anaMember.id)!
      assert.equal((await c.request('POST', '/api/pagamentos', c.ana.token, { rateioId: own.id, valor: '25.00' }, randomUUID())).status, 201)
      const summary = (await c.request<Schemas['ResumoIndividual']>('GET', `/api/me/financeiro/resumo?competencia=${month(-1)}`, c.ana.token)).body
      assert.equal(summary.totalDevido, '60.00'); assert.equal(summary.totalPago, '25.00'); assert.equal(summary.saldoPendente, '35.00')
      assert.equal((await c.request<Schemas['ResumoIndividual']>('GET', `/api/me/financeiro/resumo?competencia=${month()}`, c.ana.token)).body.totalDevido, '0.00')
      assert.equal((await c.request('POST', '/api/pagamentos', c.ana.token, { rateioId: own.id, valor: '35.00' }, randomUUID())).status, 201)
      assert.equal((await c.request<Page<Expense>>('GET', `/api/despesas?competencia=${month(-1)}&situacao=PAGAS&escopo=PESSOAL`, c.ana.token)).body.paginacao.totalItens, 1)
      assert.equal((await c.request<Page<Expense>>('GET', `/api/despesas?competencia=${month(-1)}&situacao=PAGAS&escopo=CASA`, c.ana.token)).body.paginacao.totalItens, 0)
      const compatible = await c.request<Expense[]>('GET', `/api/front/v1/despesas?competencia=${month(-1)}&situacao=PAGAS&escopo=PESSOAL`, c.ana.token)
      assert.equal(compatible.status, 200); assert.equal(compatible.body.length, 1); assert.equal(compatible.body[0]!.id, bill.id)
      assert.equal((await c.request('GET', `/api/me/financeiro/${bill.rateios.find(share => share.membroId === c.brunoMember.id)!.id}`, c.ana.token)).status, 404)
      assert.equal((await c.request('POST', '/api/republicas/sair', c.ana.token)).status, 204)
      assert.equal((await c.request<Schemas['ResumoIndividual']>('GET', `/api/me/financeiro/resumo?competencia=${month(-1)}`, c.ana.token)).body.totalPago, '60.00')
    } finally { await c.close() }
  })
  it('quando consulta vencimentos e paginação, então usa a data de Brasília e filtros coerentes', async () => {
    const c = await contextoCasa()
    try {
      const day = today(), plus = (offset: number) => { const date = new Date(day + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10) }
      for (const [offset, state] of [[-1, 'ATRASADA'], [0, 'VENCE_HOJE'], [7, 'VENCE_EM_BREVE'], [8, 'EM_DIA']] as const) {
        const bill = await c.expense(c.admin, [c.anaMember.id], { vencimento: plus(offset) })
        assert.equal(bill.situacaoVencimento, state); assert.equal(bill.dataReferencia, day)
      }
      const upcoming = (await c.request<Page<Expense>>('GET', '/api/despesas?situacao=PROXIMAS&limite=1', c.ana.token)).body
      assert.equal(upcoming.paginacao.totalItens, 2); assert.equal(upcoming.dados.length, 1)
      const second = (await c.request<Page<Expense>>('GET', '/api/despesas?situacao=PROXIMAS&limite=1&pagina=2', c.ana.token)).body
      assert.notEqual(second.dados[0]!.id, upcoming.dados[0]!.id)
      assert.equal((await c.request<Page<Expense>>('GET', '/api/despesas?situacao=PROXIMAS&pagina=3&limite=1', c.ana.token)).body.dados.length, 0)
      for (const suffix of ['pagina=0', 'limite=101', 'limite=1.5', 'pagina=1&pagina=2', 'competencia=2026-13', 'situacao=OUTRA', 'escopo=OUTRO']) {
        assert.equal((await c.request('GET', `/api/despesas?${suffix}`, c.ana.token)).status, 400)
      }
    } finally { await c.close() }
  })
})

// Fixtures de períodos são preparação de cenário, não chamadas ao serviço nem relógio simulado.
async function prepararGeracao(c: Awaited<ReturnType<typeof contextoCasa>>, ids: string[], inicio = month()) {
  return c.db.recorrenciaDespesa.create({ data: { republicaId: c.house.id, criadaPorId: c.admin.usuario.id,
    inicio: new Date(`${inicio}-01T00:00:00Z`), proximaCompetencia: new Date(`${inicio}-01T00:00:00Z`),
    chaveIdempotencia: randomUUID(), hashRequisicao: 'a'.repeat(64), configuracoes: { create: {
      titulo: 'Agendamento real', categoria: 'Casa', valorTotal: '100.00', diaVencimento: 31, vigencia: new Date(`${inicio}-01T00:00:00Z`),
      participantes: { create: ids.map(membroId => ({ membroId })) },
    } } } })
}

describe('Geração pelo processo real da API compilada', () => {
  it('quando duas instâncias iniciam e reiniciam, então geram uma competência e preservam pagamento e comprovante', { timeout: 45000 }, async () => {
    const c = await contextoCasa(), processes: Awaited<ReturnType<typeof iniciarApiCompilada>>[] = []
    try {
      const recurring = await prepararGeracao(c, [c.anaMember.id])
      const starts = await Promise.allSettled([iniciarApiCompilada(c.schema), iniciarApiCompilada(c.schema)])
      for (const start of starts) if (start.status === 'fulfilled') processes.push(start.value)
      const failed = starts.find(start => start.status === 'rejected')
      if (failed?.status === 'rejected') throw failed.reason
      const api = processes[0]!
      const list = await aguardar(() => httpProcesso<Page<Occurrence>>(api.base, 'GET', `/api/recorrencias/${recurring.id}/competencias`, c.admin.token), result => result.body.dados.some(row => row.estado === 'GERADA'))
      assert.equal(list.body.paginacao.totalItens, 1)
      const bill = (await httpProcesso<Expense>(api.base, 'GET', `/api/despesas/${list.body.dados[0]!.despesaId}`, c.ana.token)).body
      const [year, monthNumber] = month().split('-').map(Number)
      assert.equal(bill.vencimento.slice(0, 10), new Date(Date.UTC(year!, monthNumber!, 0)).toISOString().slice(0, 10))
      const key = randomUUID(), data = () => multipart(bill.rateios[0]!.id)
      const paid = await httpProcesso<Schemas['Pagamento']>(api.base, 'POST', '/api/pagamentos', c.ana.token, data(), key)
      assert.equal(paid.status, 201)
      await Promise.all(processes.map(process => process.stop())); processes.length = 0
      const restarted = await iniciarApiCompilada(c.schema); processes.push(restarted)
      const replay = await httpProcesso<Schemas['Pagamento']>(restarted.base, 'POST', '/api/pagamentos', c.ana.token, data(), key)
      assert.equal(replay.status, 201); assert.equal(replay.body.id, paid.body.id)
      assert.equal(await c.db.despesa.count(), 1); assert.equal(await c.db.pagamento.count(), 1); assert.equal(await c.db.comprovante.count(), 1)
      const response = await fetch(`${restarted.base}/api/pagamentos/${paid.body.id}/comprovante`, { headers: { Authorization: `Bearer ${c.ana.token}` } })
      assert.equal(response.status, 200); assert.equal(await response.text(), '%PDF-1.4\ncomprovante ficticio\n%%EOF')
    } finally { try { await Promise.all(processes.map(process => process.stop())) } finally { await c.close() } }
  })
  it('quando retorna após interrupção e transferência, então sinaliza o mês antigo e gera o atual pelo novo administrador', { timeout: 45000 }, async () => {
    const c = await contextoCasa(), processes: Awaited<ReturnType<typeof iniciarApiCompilada>>[] = []
    try {
      const recurring = await prepararGeracao(c, [c.anaMember.id], month(-1))
      assert.equal((await c.request('POST', '/api/republicas/transferir-admin', c.admin.token, { membroId: c.anaMember.id })).status, 200)
      const first = await iniciarApiCompilada(c.schema); processes.push(first)
      const path = `/api/recorrencias/${recurring.id}/competencias`
      await aguardar(() => httpProcesso<Page<Occurrence>>(first.base, 'GET', path, c.ana.token), result => result.body.dados.some(row => row.estado === 'PENDENTE_REVISAO'))
      await first.stop(); processes.length = 0
      const next = await iniciarApiCompilada(c.schema); processes.push(next)
      const occurrences = await aguardar(() => httpProcesso<Page<Occurrence>>(next.base, 'GET', path, c.ana.token), result => result.body.dados.some(row => row.estado === 'GERADA'))
      assert.equal(occurrences.body.paginacao.totalItens, 2)
      const generated = occurrences.body.dados.find(row => row.estado === 'GERADA')!
      const bill = (await httpProcesso<Expense>(next.base, 'GET', `/api/despesas/${generated.despesaId}`, c.ana.token)).body
      assert.equal(bill.criadaPorId, c.ana.usuario.id)
      assert.equal((await httpProcesso(next.base, 'POST', `/api/recorrencias/${recurring.id}/competencias/${month(-1)}/revisar`, c.admin.token, {})).status, 403)
      for (let i = 0; i < 2; i++) assert.equal((await httpProcesso(next.base, 'POST', `/api/recorrencias/${recurring.id}/competencias/${month(-1)}/revisar`, c.ana.token, {})).status, 204)
      assert.equal(await c.db.despesa.count(), 1); assert.equal(await c.db.pagamento.count(), 0)
    } finally { try { await Promise.all(processes.map(process => process.stop())) } finally { await c.close() } }
  })
  it('quando chega o ciclo real de um minuto, então gera a válida e pausa a inválida sem incluir moradores novos', { timeout: 85000 }, async () => {
    const c = await contextoCasa()
    let process: Awaited<ReturnType<typeof iniciarApiCompilada>> | undefined
    try {
      process = await iniciarApiCompilada(c.schema)
      await delay(1000) // Deixar a varredura inicial vazia terminar; o próximo ciclo usa o intervalo real.
      const valid = await prepararGeracao(c, [c.own.id]), invalid = await prepararGeracao(c, [c.anaMember.id])
      const carla = await c.account('carla'); await c.join(carla, c.house.codigoEntrada)
      assert.equal((await c.request('PATCH', `/api/membros/${c.anaMember.id}`, c.admin.token, { ativo: false })).status, 200)
      const observed = await aguardar(() => httpProcesso<Page<Occurrence>>(process!.base, 'GET', `/api/recorrencias/${valid.id}/competencias`, c.admin.token), result => result.body.dados.some(row => row.estado === 'GERADA'), 70000)
      const paused = await aguardar(() => httpProcesso<Schemas['Recorrencia']>(process!.base, 'GET', `/api/recorrencias/${invalid.id}`, c.admin.token), result => result.body.pausaMotivo === 'PARTICIPANTES_INATIVOS')
      assert.equal(paused.body.pausaMotivo, 'PARTICIPANTES_INATIVOS')
      const bill = (await httpProcesso<Expense>(process.base, 'GET', `/api/despesas/${observed.body.dados[0]!.despesaId}`, c.admin.token)).body
      assert.deepEqual(bill.rateios.map(share => share.membroId), [c.own.id])
      assert.equal(await c.db.despesa.count(), 1)
    } finally { try { await process?.stop() } finally { await c.close() } }
  })
})
