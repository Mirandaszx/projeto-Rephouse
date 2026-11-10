import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import express from 'express'
import { collectionEndpoint, createFrontendCompatibilityRouter, FRONT_COLLECTION_LIMIT, FRONT_PREFIX } from '../codigo/modulos/integracao/frontend-compat.js'
import { errorHandler } from '../codigo/compartilhado/http/error-handler.js'
import { pageResult, type Page } from '../codigo/compartilhado/http/pagination.js'

async function server(operation: (base: string) => Promise<void>) {
  const app = express(), api = express.Router()
  api.get('/itens', collectionEndpoint(async (req, _actor, page) => {
    assert.equal(page.pagina, req.query.pagina ? Number(req.query.pagina) : 1)
    const total = req.get('X-Test-Total') ? Number(req.get('X-Test-Total')) : 25
    return pageResult(Array.from({ length: Math.min(total, page.limite) }, (_, id) => ({ id })), total, page)
  }))
  app.use(FRONT_PREFIX, createFrontendCompatibilityRouter(express.Router(), api))
  app.use('/api', api)
  app.use(errorHandler)
  const http = app.listen(0, '127.0.0.1')
  try {
    await once(http, 'listening')
    const address = http.address(); assert.ok(address && typeof address !== 'string')
    await operation(`http://127.0.0.1:${address.port}`)
  } finally {
    http.closeAllConnections()
    await new Promise<void>(resolve => http.close(() => resolve()))
  }
}

test('compatibilidade: arrays completos além de 20 itens e API principal paginada', async () => {
  await server(async base => {
    const response = await fetch(`${base}${FRONT_PREFIX}/itens`)
    assert.equal(response.status, 200)
    assert.equal((await response.json() as unknown[]).length, 25)
    const canonical = await fetch(`${base}/api/itens`, { headers: { 'X-Front-Compatibility': 'true' } })
    const page = await canonical.json() as { dados: unknown[]; paginacao: { totalItens: number; limite: number } }
    assert.equal(page.dados.length, 20)
    assert.equal(page.paginacao.totalItens, 25)
    assert.equal(page.paginacao.limite, 20)
  })
})

test('compatibilidade: limite explícito, coleção vazia e rejeição sem truncamento', async () => {
  await server(async base => {
    for (const total of [0, FRONT_COLLECTION_LIMIT, FRONT_COLLECTION_LIMIT + 1]) {
      const response = await fetch(`${base}${FRONT_PREFIX}/itens`, { headers: { 'X-Test-Total': String(total) } })
      assert.equal(response.status, total > FRONT_COLLECTION_LIMIT ? 409 : 200)
      const body = await response.json()
      if (total > FRONT_COLLECTION_LIMIT) assert.equal((body as { error: { code: string } }).error.code, 'FRONT_COLLECTION_LIMIT')
      else { assert.ok(Array.isArray(body)); assert.equal(body.length, total) }
    }
  })
})

test('compatibilidade: não aceita parâmetros que aparentem controlar a paginação', async () => {
  await server(async base => {
    for (const query of ['pagina=1', 'limite=100', 'inativos=true', 'qualquer=1']) {
      assert.equal((await fetch(`${base}${FRONT_PREFIX}/itens?${query}`)).status, 400)
    }
    const canonical = await fetch(`${base}/api/itens?pagina=2&limite=5`)
    assert.equal(canonical.status, 200)
    assert.equal((await canonical.json() as Page<unknown>).paginacao.pagina, 2)
  })
})
