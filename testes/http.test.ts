import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import express from 'express'
import type { Express } from 'express'
import { z } from 'zod'
import { Prisma } from '../codigo/gerado/prisma/client.js'
import { createApp } from '../codigo/app.js'
import { AppError } from '../codigo/compartilhado/http/app-error.js'
import { errorHandler } from '../codigo/compartilhado/http/error-handler.js'

async function comServidor(app: Express, operacao: (baseUrl: string) => Promise<void>): Promise<void> {
  const servidor = app.listen(0, '127.0.0.1')
  try {
    await once(servidor, 'listening')
    const endereco = servidor.address()
    assert.ok(endereco && typeof endereco !== 'string')
    await operacao(`http://127.0.0.1:${endereco.port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      servidor.close(erro => erro ? reject(erro) : resolve())
    })
  }
}

function appComErro(erro: Error): Express {
  const app = express()
  app.get('/erro', () => { throw erro })
  app.use(errorHandler)
  return app
}

test('GET /api/health preserva a resposta pública existente', async () => {
  await comServidor(createApp(), async baseUrl => {
    const resposta = await fetch(`${baseUrl}/api/health`)
    assert.equal(resposta.status, 200)
    assert.match(resposta.headers.get('content-type') ?? '', /application\/json/)
    assert.deepEqual(await resposta.json(), { status: 'ok' })
  })
})

test('rota inexistente responde 404 com o contrato de erro da aplicação', async () => {
  await comServidor(createApp(), async baseUrl => {
    const resposta = await fetch(`${baseUrl}/api/rota-inexistente`)
    assert.equal(resposta.status, 404)
    assert.deepEqual(await resposta.json(), { error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } })
  })
})

test('JSON inválido responde 400 sem reproduzir o conteúdo recebido', async () => {
  await comServidor(createApp(), async baseUrl => {
    const resposta = await fetch(`${baseUrl}/api/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"senha":"fixture-privada",',
    })
    assert.equal(resposta.status, 400)
    assert.deepEqual(await resposta.json(), { error: {
      code: 'INVALID_JSON',
      message: 'O corpo da requisição contém JSON inválido.',
    } })
  })
})

test('AppError expõe somente código e mensagem públicos', async () => {
  const erro = new AppError(422, 'MEMBRO_INATIVO', 'Selecione um membro ativo.', { motivoInterno: 'fixture-privada' })
  await comServidor(appComErro(erro), async baseUrl => {
    const resposta = await fetch(`${baseUrl}/erro`)
    assert.equal(resposta.status, 422)
    assert.deepEqual(await resposta.json(), { error: { code: 'MEMBRO_INATIVO', message: 'Selecione um membro ativo.' } })
  })
})

test('validação Zod responde 400 sem expor valores rejeitados', async () => {
  const resultado = z.object({ valor: z.number().positive() }).safeParse({ valor: 'fixture-privada' })
  assert.equal(resultado.success, false)
  if (resultado.success) assert.fail('A fixture deve falhar na validação.')
  await comServidor(appComErro(resultado.error), async baseUrl => {
    const resposta = await fetch(`${baseUrl}/erro`)
    assert.equal(resposta.status, 400)
    assert.deepEqual(await resposta.json(), { error: {
      code: 'VALIDATION_ERROR',
      message: 'Os dados enviados são inválidos.',
    } })
  })
})

for (const { codigo, status, codigoHttp, mensagem } of [
  { codigo: 'P2002', status: 409, codigoHttp: 'CONFLICT', mensagem: 'Já existe um registro com estes dados.' },
  { codigo: 'P2025', status: 404, codigoHttp: 'NOT_FOUND', mensagem: 'Registro não encontrado.' },
]) {
  test(`erro Prisma ${codigo} responde ${status} sem expor detalhes do banco`, async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('SELECT senha_hash FROM usuarios; credencial=fixture-privada', {
      code: codigo,
      clientVersion: 'fixture',
      meta: { detalhes: 'fixture-privada' },
    })
    await comServidor(appComErro(erro), async baseUrl => {
      const resposta = await fetch(`${baseUrl}/erro`)
      assert.equal(resposta.status, status)
      assert.deepEqual(await resposta.json(), { error: { code: codigoHttp, message: mensagem } })
    })
  })
}

test('erro inesperado responde 500 sem SQL, credenciais ou stack trace', async () => {
  const erro = new Error('SELECT senha_hash FROM usuarios; credencial=fixture-privada')
  await comServidor(appComErro(erro), async baseUrl => {
    const resposta = await fetch(`${baseUrl}/erro`)
    assert.equal(resposta.status, 500)
    assert.deepEqual(await resposta.json(), { error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor.',
    } })
  })
})
