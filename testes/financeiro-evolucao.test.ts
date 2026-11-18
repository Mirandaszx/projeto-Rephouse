import test from 'node:test'
import assert from 'node:assert/strict'
import { dueDate, dueState, nextMonth, competenciaSchema } from '../codigo/modulos/financeiro/dominio/competencia.js'
import { civilDate } from '../codigo/configuracao/time-zone.js'
import { startRecurringScheduler } from '../codigo/modulos/financeiro/recorrencias.service.js'
import type { PrismaClient } from '../codigo/gerado/prisma/client.js'

test('competências preservam dia civil, fevereiro e viradas de ano', () => {
  for (const [month, day, expected] of [['2028-02',31,'2028-02-29'],['2027-02',29,'2027-02-28'],['2030-04',31,'2030-04-30'],['2030-01',10,'2030-01-10']] as const) {
    assert.equal(dueDate(month, day).toISOString().slice(0,10), expected)
  }
  assert.equal(nextMonth('2030-12'), '2031-01')
  for (const invalid of ['2026-00','2026-13','2026-1','2026-11-01',' 2026-11']) assert.equal(competenciaSchema.safeParse(invalid).success, false)
})
test('avisos usam saldo e janela inclusiva de sete dias', () => {
  const state = (day: string, pending = true) => dueState(new Date(day + 'T00:00:00Z'), pending, '2030-01-10')
  assert.equal(state('2030-01-09'), 'ATRASADA')
  assert.equal(state('2030-01-10'), 'VENCE_HOJE')
  assert.equal(state('2030-01-15'), 'VENCE_EM_BREVE')
  assert.equal(state('2030-01-17'), 'VENCE_EM_BREVE')
  assert.equal(state('2030-01-18'), 'EM_DIA')
  assert.equal(state('2030-01-09', false), 'QUITADA')
  assert.equal(civilDate(new Date('2030-02-01T02:59:59Z'), 'America/Sao_Paulo'), '2030-01-31')
  assert.equal(civilDate(new Date('2030-02-01T03:00:00Z'), 'America/Sao_Paulo'), '2030-02-01')
})
test('agendador inicia sem visita e o encerramento aguarda o ciclo, sem expor erro interno', async () => {
  let reject!: (reason: Error) => void
  let called = 0
  const logs: Record<string, unknown>[] = []
  const db = { recorrenciaDespesa: { findMany: () => { called++; return new Promise((_resolve, failure) => { reject = failure }) } } } as unknown as PrismaClient
  const stop = startRecurringScheduler(db, item => logs.push(item))
  assert.equal(called, 1)
  let finished = false
  const ending = stop().then(() => { finished = true })
  await Promise.resolve()
  assert.equal(finished, false)
  reject(new Error('SQL senha=segredo-interno'))
  await ending
  assert.equal(finished, true)
  assert.equal(called, 1)
  assert.doesNotMatch(JSON.stringify(logs), /SQL|segredo|senha/)
  assert.equal(logs[0]?.code, 'RECURRENCE_SCAN_FAILED')
})
