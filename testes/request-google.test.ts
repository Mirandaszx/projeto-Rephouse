import 'dotenv/config'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPair, SignJWT } from 'jose'
import { abrirRequestSpec, type Schemas } from './auxiliares/request-spec.js'
import { createGoogleVerifier } from '../codigo/modulos/autenticacao/google.verifier.js'

describe('Indisponibilidade externa do Google pela rota real', () => {
  it('quando a obtenção das chaves falha, então retorna 503 sem consumir desafio nem criar conta', async () => {
    const clientId = 'request-spec.apps.googleusercontent.com'
    const providerSecret = 'detalhe-privado-do-provedor-ficticio'
    // Único substituto: obtenção externa de chaves. O verificador real continua fazendo a validação.
    const verify = createGoogleVerifier(clientId, async () => { throw new Error(providerSecret) })
    const c = await abrirRequestSpec({ clientId, verify })
    try {
      const before = await c.db.usuario.count()
      const challenge = await c.request<Schemas['DesafioGoogle']>('POST', '/api/auth/google/desafio', undefined, { finalidade: 'login' })
      assert.equal(challenge.status, 200)
      const cookie = challenge.headers.get('set-cookie')!.split(';')[0]!
      const keys = await generateKeyPair('RS256')
      const credential = await new SignJWT({ email: 'externo@request.rephouse.test', email_verified: true, nonce: challenge.body.nonce })
        .setSubject('google-request-spec').setIssuer('https://accounts.google.com').setAudience(clientId)
        .setProtectedHeader({ alg: 'RS256', kid: 'externa' }).setIssuedAt().setExpirationTime('5m').sign(keys.privateKey)
      const result = await c.request('POST', '/api/auth/google', undefined, { credential, desafioId: challenge.body.desafioId }, undefined, { Cookie: cookie })
      assert.equal(result.status, 503); assert.equal(result.body.error.code, 'GOOGLE_UNAVAILABLE')
      assert.equal(await c.db.usuario.count(), before); assert.equal(await c.db.identidadeGoogle.count(), 0)
      assert.equal((await c.db.desafioGoogle.findUniqueOrThrow({ where: { id: challenge.body.desafioId } })).consumidoEm, null)
      const exposed = JSON.stringify({ body: result.body, logs: c.logs })
      for (const value of [providerSecret, credential, cookie]) assert.equal(exposed.includes(value), false)
    } finally { await c.close() }
  })
})
