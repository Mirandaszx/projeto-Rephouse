import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { secret } from './request-spec.js'
import { validarResposta } from './contrato.js'

export async function iniciarApiCompilada(schema: string) {
  assert.match(schema, /^integration_test_[a-f0-9]{32}$/)
  const url = new URL(process.env.TEST_DATABASE_URL!)
  url.searchParams.set('schema', schema)
  const probe = createServer().listen(0, '127.0.0.1')
  await once(probe, 'listening')
  const address = probe.address(); assert.ok(address && typeof address !== 'string')
  await new Promise<void>(resolve => probe.close(() => resolve()))
  // O IPC apenas envia o sinal normal de encerramento, também no Windows. Não altera a aplicação.
  const child = spawn(process.execPath, ['--input-type=module', '-e', "process.once('message', () => { process.disconnect(); process.emit('SIGTERM') }); await import('./dist/server.js')"], {
    env: { ...process.env, DATABASE_URL: url.toString(), JWT_SECRET: secret, NODE_ENV: 'test', HOST: '127.0.0.1', PORT: String(address.port),
      GOOGLE_CLIENT_ID: '', RESEND_API_KEY: '', BREVO_API_KEY: '', EMAIL_FROM: '', APP_PUBLIC_URL: '', CORS_ORIGINS: '', APP_TIME_ZONE: 'America/Sao_Paulo' },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  let startup = false, spawnError: Error | undefined
  child.on('error', error => { spawnError = error })
  child.stdout!.on('data', (bytes: Buffer) => { if (bytes.toString().includes('"event":"started"')) startup = true })
  child.stderr!.resume()
  const base = `http://127.0.0.1:${address.port}`
  async function stop() {
    if (spawnError) return
    if (child.exitCode !== null) { assert.equal(child.exitCode, 0, 'API encerrou inesperadamente'); return }
    const exit = once(child, 'exit')
    if (child.connected) child.send('encerrar')
    else child.kill()
    const timer = setTimeout(() => child.kill(), 16000)
    try { const [code] = await exit; assert.equal(code, 0, 'API deve encerrar normalmente') }
    finally { clearTimeout(timer) }
  }
  try {
    for (let attempt = 0; attempt < 200 && !startup; attempt++) {
      if (spawnError) throw spawnError
      assert.equal(child.exitCode, null, 'API compilada encerrou antes da inicialização')
      await delay(50)
    }
    assert.equal(startup, true, 'API compilada não iniciou')
    const ready = await fetch(`${base}/api/ready`)
    assert.equal(ready.status, 200); await ready.arrayBuffer()
    return { base, stop }
  } catch (error) { await stop(); throw error }
}

export async function httpProcesso<T>(base: string, method: string, path: string, token: string, data?: unknown, key?: string) {
  const form = data instanceof FormData
  const response = await fetch(base + path, { method, signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${token}`, ...(data && !form ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
    body: data === undefined ? undefined : form ? data : JSON.stringify(data) })
  const text = await response.text(), body = text ? JSON.parse(text) as T : undefined
  validarResposta(method, path, response.status, body)
  assert.ok(response.headers.get('x-request-id'))
  return { status: response.status, body: body as T }
}

export async function aguardar<T>(read: () => Promise<T>, matches: (value: T) => boolean, timeout = 10000): Promise<T> {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const value = await read()
    if (matches(value)) return value
    await delay(100)
  }
  throw new Error('Tempo esgotado aguardando o resultado observável da API real.')
}
