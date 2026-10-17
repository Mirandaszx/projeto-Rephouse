import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { Validator } from '@seriousme/openapi-schema-validator'
import { createApp } from '../codigo/app.js'
import { loadEnv } from '../codigo/configuracao/env.js'
import { openApiDocument } from '../codigo/openapi.js'
import { validarDados } from './auxiliares/contrato.js'

async function server(operation: (base: string) => Promise<void>, origins?: string[]) {
  const http = createApp({ corsOrigins: origins }).listen(0, '127.0.0.1')
  try {
    await once(http, 'listening')
    const address = http.address()
    assert.ok(address && typeof address !== 'string')
    await operation(`http://127.0.0.1:${address.port}`)
  } finally {
    http.closeAllConnections()
    await new Promise<void>(done => http.close(() => done()))
  }
}
test('contrato atende ao schema oficial OpenAPI 3.1 e resolve referências internas', async () => {
  const validator = new Validator()
  // A resolução de referências do validador modifica o objeto recebido.
  const result = await validator.validate(structuredClone(openApiDocument))
  assert.equal(result.valid, true, JSON.stringify(result.errors))
  assert.equal(validator.version, '3.1')
  assert.ok(validator.resolveRefs())
})
test('exemplos JSON das entradas e respostas respeitam seus schemas', () => {
  const ids = new Set<string>()
  for (const [path, operations] of Object.entries(openApiDocument.paths)) for (const [method, operation] of Object.entries(operations)) {
    assert.ok(!ids.has(operation.operationId), `operationId duplicado: ${operation.operationId}`)
    ids.add(operation.operationId)
    for (const [mediaType, media] of Object.entries(operation.requestBody?.content ?? {})) {
      if (mediaType !== 'application/json') continue
      assert.ok(media.example, `${method} ${path}: exemplo da entrada ausente`)
      validarDados(media.schema, media.example, `${method} ${path} entrada`)
    }
    for (const [status, response] of Object.entries(operation.responses)) {
      if (status === '204') { assert.equal(response.content, undefined); continue }
      assert.ok(response.content, `${method} ${path} ${status}: resposta sem conteúdo`)
      const json = response.content['application/json']
      if (!json) continue // Downloads são binários.
      assert.ok(json.example, `${method} ${path} ${status}: exemplo ausente`)
      validarDados(json.schema, json.example, `${method} ${path} ${status}`)
    }
  }
})
test('arquivo importável e contrato servido pela API estão sincronizados com o código', async () => {
  assert.deepEqual(JSON.parse(await readFile('documentacao/openapi.json', 'utf8')), openApiDocument)
  await server(async base => {
    const res = await fetch(`${base}/api/openapi.json`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), openApiDocument)
  })
})
test('CORS responde preflight de pagamentos com token e chave de idempotência', async () => {
  await server(async base => {
    const res = await fetch(`${base}/api/pagamentos`, { method: 'OPTIONS', headers: {
      Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type,idempotency-key',
    } })
    assert.equal(res.status, 204)
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    assert.match(res.headers.get('access-control-allow-headers') ?? '', /Idempotency-Key/i)
    assert.equal(res.headers.get('access-control-allow-credentials'), null)
    assert.match(res.headers.get('vary') ?? '', /Origin/i)
  }, ['http://localhost:5173'])
})
test('CORS libera somente origens exatas e expõe o nome de arquivos para download', async () => {
  await server(async base => {
    const allowed = await fetch(`${base}/api/health`, { headers: { Origin: 'http://localhost:5173' } })
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    assert.match(allowed.headers.get('access-control-expose-headers') ?? '', /Content-Disposition/i)
    for(const header of ['X-Request-Id','Retry-After','RateLimit','RateLimit-Policy'])assert.ok((allowed.headers.get('access-control-expose-headers')??'').includes(header))
    const denied = await fetch(`${base}/api/health`, { headers: { Origin: 'http://localhost:5173.evil.test' } })
    assert.equal(denied.status, 200)
    assert.equal(denied.headers.get('access-control-allow-origin'), null)
  }, ['http://localhost:5173'])
})
test('CORS vazio não libera leitura entre origens e mantém clientes sem Origin', async () => {
  await server(async base => {
    const withOrigin = await fetch(`${base}/api/health`, { headers: { Origin: 'https://example.test' } })
    assert.equal(withOrigin.headers.get('access-control-allow-origin'), null)
    assert.equal((await fetch(`${base}/api/health`)).status, 200)
  })
})
test('configuração de CORS aceita lista explícita e rejeita curingas e caminhos', () => {
  const base = { DATABASE_URL: 'postgresql://fixture:fixture@localhost:5432/fixture', JWT_SECRET: 'segredo-somente-de-teste-com-32-caracteres' }
  assert.deepEqual(loadEnv({ ...base, CORS_ORIGINS: 'http://localhost:5173, https://app.example.test' }).CORS_ORIGINS, ['http://localhost:5173', 'https://app.example.test'])
  assert.deepEqual(loadEnv(base).CORS_ORIGINS, [])
  for (const origin of ['*', 'https://app.example.test/caminho', 'https://app.example.test?query=1', 'null', 'ftp://example.test']) {
    assert.throws(() => loadEnv({ ...base, CORS_ORIGINS: origin }))
  }
})
test('JSON acima do limite retorna 413 com o contrato de erro público', async () => {
  await server(async base => {
    const res = await fetch(`${base}/api/health`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: 'a'.repeat(1024 * 1024) }) })
    assert.equal(res.status, 413)
    assert.deepEqual(await res.json(), { error: { code: 'PAYLOAD_TOO_LARGE', message: 'O corpo JSON deve ter no máximo 1 MB.' } })
  })
})
