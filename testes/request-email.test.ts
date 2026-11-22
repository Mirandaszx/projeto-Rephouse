import 'dotenv/config'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { abrirRequestSpec, password, secret, type Session } from './auxiliares/request-spec.js'
import { createApp } from '../codigo/app.js'
import { createResendSender } from '../codigo/infraestrutura/email/resend.js'

const origin = 'http://localhost:5173'
const input = () => ({ nome: 'Pessoa confirmação', email: `${randomUUID()}@email.rephouse.test`, senha: password })
async function release(c: Awaited<ReturnType<typeof abrirRequestSpec>>) {
  await c.db.$executeRaw`UPDATE limites_envio_email SET ultimo_envio = CURRENT_TIMESTAMP - interval '61 seconds'`
}

describe('Cadastro confirmado e link mágico por HTTP e PostgreSQL reais', () => {
  it('quando o envio não está configurado, então preserva senha antiga e recusa cadastro sem confirmação', async () => {
    const c = await abrirRequestSpec()
    const server = createApp({ database: c.db, jwtSecret: secret, corsOrigins: [origin], log: () => {} }).listen(0, '127.0.0.1')
    try {
      await once(server,'listening'); const address=server.address(); assert.ok(address && typeof address !== 'string')
      const base=`http://127.0.0.1:${address.port}/api/auth`, data=input()
      const before=await c.db.usuario.count()
      const methods=await fetch(base+'/metodos'); assert.equal((await methods.json() as {email:{habilitado:boolean}}).email.habilitado,false)
      const r=await fetch(base+'/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)})
      assert.equal(r.status,503);assert.equal((await r.json() as {error:{code:string}}).error.code,'EMAIL_DISABLED')
      const login=await fetch(base+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'ana@integracao.rephouse.test',senha:password})})
      assert.equal(login.status,200); assert.equal(await c.db.usuario.count(),before);assert.equal(await c.db.linkEmail.count(),0)
    } finally { server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve()));await c.close() }
  })
  it('quando solicita cadastro, então não cria conta nem sessão e grava somente hashes dos segredos', async () => {
    const c = await abrirRequestSpec()
    try {
      const data = input(), r = await c.request('POST', '/api/auth/register', undefined, { ...data, acaoRepublica: 'entrar' })
      assert.equal(r.status, 202); assert.ok(!('token' in r.body))
      assert.match(r.headers.get('set-cookie')!, /HttpOnly/); assert.match(r.headers.get('set-cookie')!, /SameSite=Lax/)
      assert.equal(await c.db.usuario.count({ where: { email: data.email } }), 0)
      assert.equal((await c.request('POST', '/api/auth/login', undefined, data)).status, 400)
      assert.equal((await c.request('POST', '/api/auth/login', undefined, { email: data.email, senha: password })).status, 401)
      const link = await c.db.linkEmail.findUniqueOrThrow({ where: { id: c.mailbox.proof(data.email).id } })
      assert.match(link.senhaHash!, /^\$argon2id\$/); assert.match(link.tokenHash, /^[a-f0-9]{64}$/)
      assert.ok(!JSON.stringify(link).includes(c.mailbox.proof(data.email).token)); assert.ok(!JSON.stringify(link).includes(password))
      const confirmed = await c.request<Session & { acaoRepublica: string }>('POST', '/api/auth/email/confirmar', undefined, c.mailbox.proof(data.email))
      assert.equal(confirmed.status, 200); assert.equal(confirmed.body.acaoRepublica, 'entrar')
      assert.equal(confirmed.body.usuario.tipoUsuario, 'USUARIO_NORMAL')
      assert.equal(await c.db.emailVerificado.count({ where: { usuarioId: confirmed.body.usuario.id } }), 1)
      assert.equal((await c.request('GET', '/api/me', confirmed.body.token)).status, 200)
      assert.equal((await c.request('POST', '/api/auth/login', undefined, { email: data.email, senha: password })).status, 200)
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, c.mailbox.proof(data.email))).status, 401)
      assert.equal((await c.request('POST', '/api/auth/register', undefined, data)).status, 409)
      assert.ok(!JSON.stringify(c.logs).includes(password)); assert.ok(!JSON.stringify(c.logs).includes(c.mailbox.proof(data.email).token))
    } finally { await c.close() }
  })
  it('quando a conta é antiga, então preserva senha, vínculo e perfil e confirma o e-mail somente pelo link', async () => {
    const c = await abrirRequestSpec()
    try {
      const before = await c.account('adminAurora'), house = await c.house(before)
      assert.equal(await c.db.emailVerificado.count(), 0)
      assert.equal((await c.request('POST', '/api/auth/email/solicitar', undefined, { email: before.usuario.email })).status, 202)
      const result = await c.request<Session>('POST', '/api/auth/email/confirmar', undefined, c.mailbox.proof(before.usuario.email))
      assert.equal(result.status, 200); assert.equal(result.body.usuario.id, before.usuario.id)
      assert.equal(result.body.usuario.tipoUsuario, 'USUARIO_ADMIN')
      const me = await c.request<{ membro: { republicaId: string } }>('GET', '/api/me', result.body.token)
      assert.equal(me.body.membro.republicaId, house.id)
      assert.equal(await c.db.emailVerificado.count(), 1)
    } finally { await c.close() }
  })
  it('quando duas confirmações concorrem, então apenas uma consome o link e cria a conta', async () => {
    const c = await abrirRequestSpec()
    try {
      const data = input()
      assert.equal((await c.request('POST', '/api/auth/register', undefined, data)).status, 202)
      const results = await Promise.all([1, 2].map(() => c.request('POST', '/api/auth/email/confirmar', undefined, c.mailbox.proof(data.email))))
      assert.deepEqual(results.map(result => result.status).sort(), [200, 401])
      assert.equal(await c.db.usuario.count({ where: { email: data.email } }), 1)
      assert.equal(await c.db.emailVerificado.count(), 1)
    } finally { await c.close() }
  })
  it('quando outro navegador ou origem tenta confirmar, então não consome o link nem cria conta', async () => {
    const c = await abrirRequestSpec()
    try {
      const data = input(); await c.request('POST', '/api/auth/register', undefined, data)
      const proof = c.mailbox.proof(data.email)
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, proof, undefined, { Cookie: '' })).status, 401)
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, proof, undefined, { Cookie: 'rephouse_email=' + randomBytes(32).toString('base64url') })).status, 401)
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, proof, undefined, { Origin: 'https://invasor.example.test' })).status, 403)
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, { ...proof, token: 'inválido' })).status, 400)
      const get = await fetch(c.base + '/api/auth/email/confirmar')
      // O roteador privado de fallback exige autenticação; GET nunca confirma identidade.
      assert.equal(get.status, 401); assert.deepEqual(await get.json(), { error: { code: 'UNAUTHENTICATED', message: 'Autenticação necessária.' } })
      assert.equal((await c.db.linkEmail.findUniqueOrThrow({ where: { id: proof.id } })).consumidoEm, null)
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, proof)).status, 200)
    } finally { await c.close() }
  })
  it('quando o link expira ou é substituído por reenvio, então rejeita o anterior e aceita o novo', async () => {
    const c = await abrirRequestSpec()
    try {
      const data = input(); await c.request('POST', '/api/auth/register', undefined, data)
      const old = c.mailbox.proof(data.email)
      await c.db.linkEmail.update({ where: { id: old.id }, data: { criadoEm: new Date(Date.now() - 700_000), expiraEm: new Date(Date.now() - 100_000) } })
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, old)).status, 401)
      await release(c)
      assert.equal((await c.request('POST', '/api/auth/email/solicitar', undefined, { email: data.email, finalidade: 'cadastro' })).status, 202)
      const latest = c.mailbox.proof(data.email); assert.notEqual(latest.id, old.id)
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, old)).status, 401)
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, latest)).status, 200)
    } finally { await c.close() }
  })
  it('quando uma solicitação tenta substituir a senha de cadastro pendente, então preserva os dados do primeiro navegador', async () => {
    const c = await abrirRequestSpec()
    try {
      const data = input(); await c.request('POST', '/api/auth/register', undefined, data)
      const first = await c.db.linkEmail.findUniqueOrThrow({ where: { id: c.mailbox.proof(data.email).id } })
      const firstCookie = c.emailCookie()
      await release(c)
      assert.equal((await c.request('POST', '/api/auth/register', undefined, { ...data, senha: 'Outra-senha-muito-segura-2026' }, undefined, { Cookie: '' })).status, 202)
      assert.equal(c.mailbox.messages.length, 1)
      assert.equal((await c.db.linkEmail.findUniqueOrThrow({ where: { id: first.id } })).senhaHash, first.senhaHash)
      assert.equal((await c.request('POST', '/api/auth/email/solicitar', undefined, { email: data.email, finalidade: 'cadastro' }, undefined, { Cookie: '' })).status, 202)
      assert.equal(c.mailbox.messages.length, 1)
      const oldCookie = firstCookie
      await c.db.linkEmail.update({where:{id:first.id},data:{criadoEm:new Date(Date.now()-700_000),expiraEm:new Date(Date.now()-100_000)}})
      await c.db.$executeRaw`UPDATE limites_envio_email SET janela_inicio=CURRENT_TIMESTAMP-interval '16 minutes'`
      assert.equal((await c.request('POST','/api/auth/register',undefined,data,undefined,{Cookie:''})).status,202)
      assert.equal(c.mailbox.messages.length,2)
      const latestCookie=c.emailCookie(), latest=c.mailbox.proof(data.email)
      await release(c)
      assert.equal((await c.request('POST','/api/auth/email/solicitar',undefined,{email:data.email,finalidade:'cadastro'},undefined,{Cookie:oldCookie})).status,202)
      assert.equal(c.mailbox.messages.length,2)
      assert.equal((await c.request('POST','/api/auth/email/confirmar',undefined,latest,undefined,{Cookie:latestCookie})).status,200)
    } finally { await c.close() }
  })
  it('quando a conta é desconhecida, bloqueada ou excluída, então responde genericamente sem enviar acesso', async () => {
    const c = await abrirRequestSpec()
    try {
      const a = await c.account('ana'), b = await c.account('bruno'), master = await c.account('master')
      await c.request('PATCH', `/api/master/usuarios/${a.usuario.id}/status`, master.token, { ativo: false })
      await c.request('DELETE', '/api/me', b.token, { senha: password })
      const results = []
      for (const email of [input().email, a.usuario.email, b.usuario.email]) results.push(await c.request('POST', '/api/auth/email/solicitar', undefined, { email }))
      assert.deepEqual(results.map(r => r.status), [202, 202, 202]); assert.deepEqual(results[0].body, results[1].body); assert.deepEqual(results[1].body, results[2].body)
      assert.equal(c.mailbox.messages.length, 0)
    } finally { await c.close() }
  })
  it('quando faz logout ou bloqueio após solicitar, então um link anterior não contorna a revogação', async () => {
    const c = await abrirRequestSpec()
    try {
      const a = await c.account('ana'), b = await c.account('bruno'), master = await c.account('master')
      for (const account of [a, b]) await c.request('POST', '/api/auth/email/solicitar', undefined, { email: account.usuario.email })
      await c.request('POST', '/api/auth/logout', a.token)
      await c.request('PATCH', `/api/master/usuarios/${b.usuario.id}/status`, master.token, { ativo: false })
      for (const account of [a, b]) assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, c.mailbox.proof(account.usuario.email))).status, 401)
      assert.equal(await c.db.emailVerificado.count(), 0)
    } finally { await c.close() }
  })
  it('quando uma constraint real falha na confirmação, então reverte conta, prova e consumo na mesma transação', async () => {
    const c = await abrirRequestSpec()
    try {
      const data = input(); await c.request('POST', '/api/auth/register', undefined, data)
      await c.db.$executeRawUnsafe('ALTER TABLE emails_verificados ADD CONSTRAINT rejeicao_teste CHECK (false)')
      const proof = c.mailbox.proof(data.email)
      // CHECK segue o mapeamento público já existente: 400 VALIDATION_ERROR.
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, proof)).status, 400)
      assert.equal(await c.db.usuario.count({ where: { email: data.email } }), 0)
      assert.equal((await c.db.linkEmail.findUniqueOrThrow({ where: { id: proof.id } })).consumidoEm, null)
      await c.db.$executeRawUnsafe('ALTER TABLE emails_verificados DROP CONSTRAINT rejeicao_teste')
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, proof)).status, 200)
    } finally { await c.close() }
  })
  it('quando o provedor falha depois de gravar a solicitação, então mantém cookie e permite reenvio sem criar conta', async () => {
    const c = await abrirRequestSpec()
    try {
      const data = input(), original = c.mailbox.options.send
      c.mailbox.options.send = createResendSender('re_chave_sintetica_teste', 'onboarding@resend.dev', async () => new Response('segredo-nao-publico', { status: 500 }))
      const r = await c.request('POST', '/api/auth/register', undefined, data)
      assert.equal(r.status, 503); assert.ok(r.headers.get('set-cookie')); assert.equal(await c.db.usuario.count({ where: { email: data.email } }), 0)
      assert.ok(!JSON.stringify(r.body).includes('segredo-nao-publico'))
      c.mailbox.options.send = original; await release(c)
      assert.equal((await c.request('POST', '/api/auth/email/solicitar', undefined, { email: data.email, finalidade: 'cadastro' })).status, 202)
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, c.mailbox.proof(data.email))).status, 200)
    } finally { await c.close() }
  })
  it('quando há reenvios, então limita por endereço no banco e por IP sem criar mais links', async () => {
    const c = await abrirRequestSpec()
    try {
      const a = await c.account('ana')
      await c.request('POST', '/api/auth/email/solicitar', undefined, { email: a.usuario.email })
      await c.request('POST', '/api/auth/email/solicitar', undefined, { email: a.usuario.email })
      assert.equal(c.mailbox.messages.length, 1)
      for (let i = 0; i < 3; i++) { await release(c); await c.request('POST', '/api/auth/email/solicitar', undefined, { email: a.usuario.email }) }
      assert.equal(c.mailbox.messages.length, 3)
      assert.equal((await c.db.limiteEnvioEmail.findFirstOrThrow()).quantidade, 3)
      let limited = false
      for (let i = 0; i < 20 && !limited; i++) {
        const r = await c.request('POST', '/api/auth/email/solicitar', undefined, { email: input().email })
        if (r.status === 429) { limited = true; assert.ok(r.headers.get('retry-after')) }
      }
      assert.ok(limited)
    } finally { await c.close() }
  })
  it('quando reinicia a API, então o token continua verificável pelo banco e a confirmação funciona uma vez', async () => {
    const c = await abrirRequestSpec()
    let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined
    try {
      const data = input(); await c.request('POST', '/api/auth/register', undefined, data)
      c.server.closeAllConnections(); await new Promise<void>(resolve => c.server.close(() => resolve()))
      server = createApp({ database: c.db, jwtSecret: secret, corsOrigins: [origin], email: c.mailbox.options, log: () => {} }).listen(0, '127.0.0.1')
      await once(server, 'listening'); const address = server.address(); assert.ok(address && typeof address !== 'string')
      const r = await fetch(`http://127.0.0.1:${address.port}/api/auth/email/confirmar`, { method: 'POST', headers: { Origin: origin, Cookie: c.emailCookie(), 'Content-Type': 'application/json' }, body: JSON.stringify(c.mailbox.proof(data.email)) })
      assert.equal(r.status, 200); assert.equal(await c.db.usuario.count({ where: { email: data.email } }), 1)
    } finally {
      if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())) }
      // O servidor original já foi encerrado; close() do harness também fecha o schema.
      await c.close()
    }
  })
})
