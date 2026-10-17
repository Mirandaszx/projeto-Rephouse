import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createApp } from '../codigo/app.js'

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
    assert.ok(logs.every(log => typeof log.durationMs === 'number' && typeof log.status === 'number'))
    assert.doesNotMatch(JSON.stringify(logs), /segredo|nao-registrar|injetado|Authorization|senha/)
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})
