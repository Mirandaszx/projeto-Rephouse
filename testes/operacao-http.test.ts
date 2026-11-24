import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createApp } from '../codigo/app.js'
import { operationalLog } from '../codigo/compartilhado/http/request-log.js'

test('logs operacionais preservam campos existentes e permitem ingestão com data, serviço e severidade', () => {
  const source = { event: 'http', timestamp: '2026-11-22T12:00:00.000Z', requestId: 'request-demo', status: 200, durationMs: 1.23 }
  const log = operationalLog(source)
  for (const [key, value] of Object.entries(source)) assert.equal(log[key], value)
  assert.equal(log['@timestamp'], source.timestamp)
  assert.equal(log['service.name'], 'rephouse-api')
  assert.equal(log['service.version'], '4.2.0')
  assert.equal(log['log.level'], 'info')
  assert.equal(operationalLog({ event: 'http', status: 401 })['log.level'], 'warn')
  assert.equal(operationalLog({ event: 'http', status: 503 })['log.level'], 'error')
  assert.equal(operationalLog({ event: 'startup_failed' })['log.level'], 'error')
  assert.ok(Number.isFinite(Date.parse(String(operationalLog({ event: 'started' })['@timestamp']))))
  assert.equal('message' in log, false)
  const filtrado = operationalLog({ event: 'auth_failed', code: 'X', email: 'pessoa@exemplo.test', token: 'segredo', erro: new Error('interno') })
  for (const campo of ['email', 'token', 'erro']) assert.equal(campo in filtrado, false)
  assert.equal(filtrado.code, 'X')
})

test('saúde permanece estável; readiness detecta erro e timeout; logs omitem dados privados', async () => {
  const logs: Record<string, unknown>[] = []
  let mode = 'ok'
  const server = createApp({ log: event => logs.push(event), readiness: async () => {
    if (mode === 'error') throw new Error('postgres://usuario:segredo@host/banco')
    if (mode === 'timeout') await new Promise(() => {})
  } }).listen(0, '127.0.0.1')
  try {
    await once(server, 'listening')
    const addr = server.address()
    assert.ok(addr && typeof addr !== 'string')
    const base = `http://127.0.0.1:${addr.port}`
    const health = await fetch(`${base}/api/health?token=nao-registrar`, { headers: { Authorization: 'Bearer segredo-header', 'X-Request-Id': 'injetado' } })
    assert.deepEqual(await health.json(), { status: 'ok' })
    assert.match(health.headers.get('x-request-id')!, /^[\da-f-]{36}$/)
    assert.equal((await fetch(`${base}/api/ready`)).status, 200)
    for (const value of ['error', 'timeout']) {
      mode = value
      const start = performance.now()
      const response = await fetch(`${base}/api/ready`)
      assert.equal(response.status, 503)
      assert.deepEqual(await response.json(), { status: 'unavailable' })
      assert.ok(performance.now() - start < 2000)
    }
    await fetch(`${base}/segredo-no-caminho`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: 'segredo-body' }) })
    assert.ok(logs.some(log => log.path === '/api/health' && log.requestId === health.headers.get('x-request-id')))
    assert.ok(logs.filter(log=>log.event==='http').every(log => typeof log.durationMs === 'number' && typeof log.status === 'number'))
    assert.ok(logs.filter(log=>log.event==='error').every(log=>typeof log.requestId==='string'&&typeof log.code==='string'))
    assert.doesNotMatch(JSON.stringify(logs), /segredo|nao-registrar|injetado|Authorization|senha/)
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})

test('amostra de saturação registra memória e event loop como números, e os campos chegam ao log operacional', async () => {
  const { startSaturationSampler } = await import('../codigo/modulos/saude/saturacao.js')
  const eventos: Record<string, unknown>[] = []
  const parar = startSaturationSampler(evento => { eventos.push(operationalLog(evento)) }, 20)
  try {
    while (eventos.length === 0) await new Promise(resolve => setTimeout(resolve, 10))
  } finally { parar() }
  const [amostra] = eventos
  assert.equal(amostra!.event, 'runtime')
  assert.equal(amostra!['log.level'], 'info')
  for (const campo of ['memoryRssMb', 'heapUsedMb', 'eventLoopUtilization', 'eventLoopDelayP99Ms']) {
    assert.equal(typeof amostra![campo], 'number', campo)
    assert.ok(Number.isFinite(amostra![campo] as number) && (amostra![campo] as number) >= 0, campo)
  }
  assert.ok((amostra!.eventLoopUtilization as number) <= 1)
})
