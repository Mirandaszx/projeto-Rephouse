import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { once } from 'node:events'
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose'
import { createApp } from '../codigo/app.js'
import { createGoogleVerifier } from '../codigo/modulos/autenticacao/google.verifier.js'
import { abrirAmbienteIntegracao } from '../ferramentas/integracao/ambiente.js'
import { validarResposta } from './auxiliares/contrato.js'
import type { components } from '../integracao/api.js'
import { AppError } from '../codigo/compartilhado/http/app-error.js'

type Session = components['schemas']['Sessao']
type Challenge = components['schemas']['DesafioGoogle']
const origin = 'http://localhost:5173', senha = 'Senha-google-ficticia-2026!'
const clientId = '123-test.apps.googleusercontent.com'

test('Google: assinatura real controlada, HTTP e PostgreSQL isolado', { timeout: 120000 }, async t => {
  const env = await abrirAmbienteIntegracao(process.env.TEST_DATABASE_URL, senha)
  const keys = await generateKeyPair('RS256'), wrongKeys = await generateKeyPair('RS256')
  const jwk = { ...await exportJWK(keys.publicKey), kid: 'test', alg: 'RS256' }
  const verifier = createGoogleVerifier(clientId, createLocalJWKSet({ keys: [jwk] }))
  const digest = (value: string) => createHash('sha256').update(value).digest('hex')
  async function credential(challenge: Challenge, email = `${randomUUID()}@google.example.test`, sub: string = randomUUID(), extra: Record<string, unknown> = {}, wrong = false) {
    return new SignJWT({ email, email_verified: true, nonce: challenge.nonce, name: 'Pessoa Google', ...extra, sub })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer('https://accounts.google.com')
      .setAudience(clientId).setIssuedAt().setExpirationTime('5m')
      .sign(wrong ? wrongKeys.privateKey : keys.privateKey)
  }
  type Runner = (ctx: {
    request: <T = Record<string, unknown>>(path: string, body?: unknown, token?: string, method?: string, headers?: Record<string, string>) => Promise<{ status: number; body: T; response: Response }>
    challenge: (purpose?: string, token?: string) => Promise<Challenge>
    cookie: () => string
  }) => Promise<void>
  async function scenario(name: string, run: Runner, enabled = true, secureCookies = false) {
    await t.test(name, async () => {
      const logs: Record<string, unknown>[] = [], secrets: string[] = []
      const server = createApp({ database: env.db, jwtSecret: 'segredo-google-controlado-mais-de-32-caracteres',
        corsOrigins: [origin], log: event => { logs.push(event) }, google: enabled ? { clientId, verify: verifier, secureCookies } : undefined,
      }).listen(0, '127.0.0.1')
      await once(server, 'listening')
      const address = server.address(); assert.ok(address && typeof address !== 'string')
      let cookie = ''
      async function request<T = Record<string, unknown>>(path: string, body?: unknown, token?: string, method = 'POST', headers?: Record<string, string>) {
        if (body && typeof body === 'object' && 'credential' in body && typeof body.credential === 'string') secrets.push(body.credential)
        if (body && typeof body === 'object' && 'senha' in body && typeof body.senha === 'string') secrets.push(body.senha)
        if (token) secrets.push(token)
        const response = await fetch(`http://127.0.0.1:${(address as {port:number}).port}/api${path}`, {
          method, headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie,
            ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
        const setCookie = response.headers.get('set-cookie')
        if (setCookie) { cookie = setCookie.split(';')[0]!; secrets.push(cookie.split('=')[1]!) }
        const text = await response.text(), result = text ? JSON.parse(text) : undefined
        if (method === 'OPTIONS') { assert.equal(response.status, 204); assert.equal(text, '') }
        else validarResposta(method, '/api' + path, response.status, result)
        assert.doesNotMatch(text, /"(?:senhaHash|cookieHash|nonceHash|sub|credential)"/)
        return { status: response.status, body: result as T, response }
      }
      async function challenge(purpose = 'login', token?: string) {
        const result = await request<Challenge>('/auth/google/desafio', { finalidade: purpose }, token)
        assert.equal(result.status, 200)
        const header = result.response.headers.get('set-cookie')!
        assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Lax/); assert.match(header, /Path=\/api/)
        return result.body
      }
      try {
        await run({ request, challenge, cookie: () => cookie })
        const recorded = JSON.stringify(logs)
        for (const secret of secrets.filter(value => value.length > 16)) assert.ok(!recorded.includes(secret), 'Logs não podem expor credenciais')
      }
      finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
    })
  }
  try {
    await scenario('sem configuração mantém senha, oculta Google e rejeita desafio', async ({ request }) => {
      assert.deepEqual((await request('/auth/metodos', undefined, undefined, 'GET')).body, { google: { habilitado: false, clientId: null } })
      assert.equal((await request('/auth/google/desafio', {})).status, 503)
      assert.equal((await request('/auth/login', { email: 'ana@integracao.rephouse.test', senha })).status, 200)
    }, false)
    await scenario('cria NORMAL sem senha, guarda hashes e retorna à mesma conta', async ({ request, challenge, cookie }) => {
      const first = await challenge(), email = `${randomUUID()}@google.example.test`, sub = randomUUID()
      const stored = await env.db.desafioGoogle.findUniqueOrThrow({ where: { id: first.desafioId } })
      assert.equal(stored.nonceHash, digest(first.nonce)); assert.equal(stored.cookieHash, digest(cookie().split('=')[1]!))
      const proof = { credential: await credential(first, email, sub), desafioId: first.desafioId }
      const signed = await request<Session>('/auth/google', proof); assert.equal(signed.status, 200)
      const user = await env.db.usuario.findUniqueOrThrow({ where: { id: signed.body.usuario.id } })
      assert.equal(user.senhaHash, null); assert.equal(user.tipoUsuario, 'USUARIO_NORMAL')
      assert.equal((await request('/auth/login', { email, senha })).status, 401)
      assert.equal((await request('/auth/google', proof)).status, 401)
      const second = await challenge()
      const returned = await request<Session>('/auth/google', { credential: await credential(second, 'mudou@google.example.test', sub), desafioId: second.desafioId })
      assert.equal(returned.body.usuario.id, user.id); assert.equal(returned.body.usuario.email, email)
      assert.equal(await env.db.identidadeGoogle.count({ where: { sub } }), 1)
    })
    await scenario('email existente exige senha e preserva perfil, vínculo e tarefa após transferência', async ({ request, challenge }) => {
      const email = `${randomUUID()}@google.example.test`, sub = randomUUID()
      const registered = await request<Session>('/auth/register', { nome: 'Administrador local', email, senha })
      const republic = await request<{ codigoEntrada: string; id: string }>('/republicas', { nome: 'Casa Google' }, registered.body.token)
      const member = await request<{id:string}>('/republicas/entrar', {codigoEntrada:republic.body.codigoEntrada}, (await request<Session>('/auth/login',{email:'bruno@integracao.rephouse.test',senha})).body.token)
      const task = await request<{id:string}>('/tarefas', {titulo:'Guardar histórico',responsavelId:member.body.id}, registered.body.token)
      const ch = await challenge(), proof = {credential: await credential(ch,email,sub),desafioId:ch.desafioId}
      const required=await request<{error:{code:string}}>('/auth/google',proof)
      assert.equal(required.status,409);assert.equal(required.body.error.code,'GOOGLE_LINK_REQUIRED')
      assert.equal((await env.db.desafioGoogle.findUniqueOrThrow({where:{id:ch.desafioId}})).consumidoEm,null)
      assert.equal((await request('/auth/google',{...proof,senha:'Errada123!'})).status,401)
      const linked = await request<Session>('/auth/google',{...proof,senha}); assert.equal(linked.status,200)
      assert.equal(linked.body.usuario.id,registered.body.usuario.id);assert.equal(linked.body.usuario.tipoUsuario,'USUARIO_ADMIN')
      assert.equal((await env.db.tarefa.findUniqueOrThrow({where:{id:task.body.id}})).titulo,'Guardar histórico')
      assert.equal((await request('/republicas/transferir-admin',{membroId:member.body.id},linked.body.token)).status,200)
      const again=await challenge();const session=await request<Session>('/auth/google',{credential:await credential(again,email,sub),desafioId:again.desafioId})
      assert.equal(session.body.usuario.tipoUsuario,'USUARIO_NORMAL')
      assert.equal((await request('/tarefas',{titulo:'Sem poder antigo',responsavelId:member.body.id},session.body.token)).status,403)
      const conflict=await challenge();assert.equal((await request('/auth/google',{credential:await credential(conflict,email),desafioId:conflict.desafioId,senha})).status,409)
    })
    await scenario('rejeita assinatura, validade, público, emissor e email não verificado', async ({ request, challenge }) => {
      for (const variant of ['signature','expired','aud','iss','email','nonce','missing','azp']) {
        const ch=await challenge()
        let jwt=await credential(ch,undefined,undefined,variant==='email'?{email_verified:false}:variant==='nonce'?{nonce:'outro'}:variant==='azp'?{azp:'outro-cliente'}:{},variant==='signature')
        if(['expired','aud','iss','missing'].includes(variant)) {
          let signer=new SignJWT({sub:randomUUID(),email:'invalid@google.example.test',email_verified:true,nonce:ch.nonce})
            .setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(variant==='iss'?'https://evil.example':'accounts.google.com')
            .setAudience(variant==='aud'?'outro-client':clientId)
          if(variant!=='missing')signer=signer.setExpirationTime(variant==='expired'?'1 sec ago':'5m')
          jwt=await signer.sign(keys.privateKey)
        }
        assert.equal((await request('/auth/google',{credential:jwt,desafioId:ch.desafioId})).status,401,variant)
      }
    })
    await scenario('rejeita origem, cookie, nonce, finalidade e desafio expirado', async ({ request, challenge }) => {
      assert.equal((await request('/auth/google/desafio',{},undefined,'POST',{Origin:'https://evil.example'})).status,403)
      assert.equal((await request('/auth/google/desafio',{finalidade:'exclusao'})).status,401)
      const ch=await challenge(),proof={credential:await credential(ch),desafioId:ch.desafioId}
      assert.equal((await request('/auth/google',proof,undefined,'POST',{Cookie:''})).status,401)
      assert.equal((await request('/auth/google',proof,undefined,'POST',{Origin:''})).status,403)
      await env.db.desafioGoogle.update({where:{id:ch.desafioId},data:{expiraEm:new Date(0)}})
      assert.equal((await request('/auth/google',proof)).status,401)
      await challenge();assert.equal(await env.db.desafioGoogle.count({where:{id:ch.desafioId}}),0)
    })
    await scenario('concorrência não duplica conta nem vínculo; desafio é de uso único', async ({ request, challenge }) => {
      const email=`${randomUUID()}@google.example.test`,sub=randomUUID()
      const a=await challenge(),b=await challenge()
      const [one,two]=await Promise.all([request<Session>('/auth/google',{credential:await credential(a,email,sub),desafioId:a.desafioId}),request<Session>('/auth/google',{credential:await credential(b,email,sub),desafioId:b.desafioId})])
      assert.equal(one.status,200);assert.equal(two.status,200);assert.equal(one.body.usuario.id,two.body.usuario.id)
      assert.equal(await env.db.usuario.count({where:{email}}),1)
      const c=await challenge(),proof={credential:await credential(c,email,sub),desafioId:c.desafioId}
      const results=await Promise.all([request('/auth/google',proof),request('/auth/google',proof)])
      assert.deepEqual(results.map(r=>r.status).sort(),[200,401])
    })
    await scenario('vinculação concorrente conserva uma identidade e o mesmo usuário', async ({request,challenge})=>{
      const email=`${randomUUID()}@google.example.test`,sub=randomUUID()
      const registered=await request<Session>('/auth/register',{nome:'Vínculo concorrente',email,senha})
      const a=await challenge(),b=await challenge()
      const results=await Promise.all([request<Session>('/auth/google',{credential:await credential(a,email,sub),desafioId:a.desafioId,senha}),request<Session>('/auth/google',{credential:await credential(b,email,sub),desafioId:b.desafioId,senha})])
      for(const result of results){assert.equal(result.status,200);assert.equal(result.body.usuario.id,registered.body.usuario.id)}
      assert.equal(await env.db.identidadeGoogle.count({where:{usuarioId:registered.body.usuario.id}}),1)
    })
    await scenario('bloqueio e exclusão não são revertidos pelo Google', async ({ request, challenge }) => {
      const email=`${randomUUID()}@google.example.test`,sub=randomUUID(),ch=await challenge()
      const user=(await request<Session>('/auth/google',{credential:await credential(ch,email,sub),desafioId:ch.desafioId})).body
      await env.db.usuario.update({where:{id:user.usuario.id},data:{ativo:false}})
      const blocked=await challenge();assert.equal((await request('/auth/google',{credential:await credential(blocked,email,sub),desafioId:blocked.desafioId})).status,401)
      await env.db.usuario.update({where:{id:user.usuario.id},data:{ativo:true}})
      const confirmation=await challenge('exclusao',user.token)
      assert.equal((await request('/me',{credential:await credential(confirmation,email,sub),desafioId:confirmation.desafioId},user.token,'DELETE')).status,204)
      const deleted=await env.db.usuario.findUniqueOrThrow({where:{id:user.usuario.id}});assert.equal(deleted.ativo,false);assert.ok(deleted.excluidoEm)
      assert.equal((await request('/me',undefined,user.token,'GET')).status,401)
      const retry=await challenge();assert.equal((await request('/auth/google',{credential:await credential(retry,email,sub),desafioId:retry.desafioId})).status,401)
    })
    await scenario('exclusão exige Google próprio e preserva restrição de administração e último MASTER', async ({ request, challenge }) => {
      const email=`${randomUUID()}@google.example.test`,sub=randomUUID(),ch=await challenge()
      const user=(await request<Session>('/auth/google',{credential:await credential(ch,email,sub),desafioId:ch.desafioId})).body
      const other=await challenge('exclusao',user.token)
      assert.equal((await request('/me',{credential:await credential(other),desafioId:other.desafioId},user.token,'DELETE')).status,403)
      await request('/republicas',{nome:'Casa administrada Google'},user.token)
      const admin=await challenge('exclusao',user.token)
      const conflict=await request<{error:{code:string}}>('/me',{credential:await credential(admin,email,sub),desafioId:admin.desafioId},user.token,'DELETE')
      assert.equal(conflict.status,409);assert.equal(conflict.body.error.code,'TRANSFER_ADMIN_REQUIRED')
      const master=await request<Session>('/auth/login',{email:'master@integracao.rephouse.test',senha})
      const mc=await challenge();assert.equal((await request('/auth/google',{credential:await credential(mc,'master@integracao.rephouse.test','master-google'),desafioId:mc.desafioId,senha})).status,200)
      const md=await challenge('exclusao',master.body.token)
      const last=await request<{error:{code:string}}>('/me',{credential:await credential(md,'master@integracao.rephouse.test','master-google'),desafioId:md.desafioId},master.body.token,'DELETE')
      assert.equal(last.status,409);assert.equal(last.body.error.code,'LAST_MASTER')
    })
    await scenario('revogação impede confirmação Google de uma sessão antiga', async ({ request, challenge }) => {
      const local=await request<Session>('/auth/register',{nome:'Revogado',email:`${randomUUID()}@google.example.test`,senha})
      const sub=randomUUID(), link=await challenge()
      await request('/auth/google',{credential:await credential(link,local.body.usuario.email,sub),desafioId:link.desafioId,senha})
      const proof=await challenge('exclusao',local.body.token)
      await request('/auth/logout',undefined,local.body.token)
      assert.equal((await request('/auth/google/desafio',{finalidade:'exclusao'},local.body.token)).status,401)
      assert.equal((await request('/me',{credential:await credential(proof,local.body.usuario.email,sub),desafioId:proof.desafioId},local.body.token,'DELETE')).status,401)
    })
    await scenario('conta Google mantém dívida após saída e não pode excluir antes de quitar',async({request,challenge})=>{
      const email=`${randomUUID()}@google.example.test`,sub=randomUUID(),first=await challenge()
      const google=(await request<Session>('/auth/google',{credential:await credential(first,email,sub),desafioId:first.desafioId})).body
      const owner=(await request<Session>('/auth/register',{nome:'Admin dívida',email:`${randomUUID()}@google.example.test`,senha})).body
      const republic=await request<{codigoEntrada:string}>('/republicas',{nome:'Dívida Google'},owner.token)
      const member=await request<{id:string}>('/republicas/entrar',{codigoEntrada:republic.body.codigoEntrada},google.token)
      assert.equal((await request('/despesas',{titulo:'Conta existente',categoria:'CASA',valorTotal:'10.00',vencimento:'2030-01-20',membroIds:[member.body.id]},owner.token)).status,201)
      assert.equal((await request('/republicas/sair',undefined,google.token)).status,204)
      const del=await challenge('exclusao',google.token)
      const result=await request<{error:{code:string}}>('/me',{credential:await credential(del,email,sub),desafioId:del.desafioId},google.token,'DELETE')
      assert.equal(result.status,409);assert.equal(result.body.error.code,'OUTSTANDING_DEBT')
      assert.equal(await env.db.rateioDespesa.count({where:{membroId:member.body.id,status:'PENDENTE'}}),1)
      assert.equal((await env.db.usuario.findUniqueOrThrow({where:{id:google.usuario.id}})).ativo,true)
      assert.equal((await env.db.desafioGoogle.findUniqueOrThrow({where:{id:del.desafioId}})).consumidoEm,null)
    })
    await scenario('cookie em produção é Secure e CORS mantém preflight e headers de suporte',async({request,challenge})=>{
      const ch=await challenge()
      const next=await request('/auth/google/desafio',{})
      assert.match(next.response.headers.get('set-cookie')??'',/; Secure/)
      const cors=await request('/auth/google',undefined,undefined,'OPTIONS',{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'})
      assert.equal(cors.status,204);assert.equal(cors.response.headers.get('access-control-allow-origin'),origin)
      assert.ok(cors.response.headers.get('access-control-allow-headers')?.includes('Content-Type'))
      assert.match(next.response.headers.get('access-control-expose-headers')??'',/X-Request-Id/)
      assert.ok(ch.nonce)
    },true,true)
    await scenario('limitadores compartilham login e Google e limitam desafios a 60', async ({ request }) => {
      for(let i=0;i<20;i++)assert.equal((await request(i%2?'/auth/google':'/auth/login',i%2?{credential:'invalida',desafioId:randomUUID()}:{email:'ausente@google.example.test',senha})).status,401)
      const limited=await request('/auth/register',{nome:'Limite',email:'limite@google.example.test',senha});assert.equal(limited.status,429);assert.ok(limited.response.headers.get('Retry-After'))
      for(let i=0;i<60;i++)assert.equal((await request('/auth/google/desafio',{})).status,200)
      const challenges=await request('/auth/google/desafio',{});assert.equal(challenges.status,429);assert.ok(challenges.response.headers.get('Retry-After'))
    })
    await t.test('falha na obtenção de chaves é 503; não revela mensagem interna', async () => {
      const unavailable=createGoogleVerifier(clientId,async()=>{throw new Error('segredo do provedor')})
      const ch={desafioId:randomUUID(),nonce:'nonce',expiraEm:new Date().toISOString()}
      await assert.rejects(unavailable(await credential(ch)),error=>error instanceof AppError&&error.statusCode===503&&!error.message.includes('segredo'))
    })
    await t.test('banco rejeita conta sem acesso e remoção da única identidade', async () => {
      const email=`${randomUUID()}@google.example.test`
      await assert.rejects(env.db.usuario.create({data:{email,nome:'Sem acesso'}}))
      assert.equal(await env.db.usuario.count({where:{email}}),0)
      const linked=await env.db.identidadeGoogle.findFirstOrThrow({where:{usuario:{senhaHash:null}}})
      await assert.rejects(env.db.identidadeGoogle.delete({where:{sub:linked.sub}}))
      assert.equal(await env.db.identidadeGoogle.count({where:{sub:linked.sub}}),1)
      await assert.rejects(env.db.$transaction(async tx=>{
        const user=await tx.usuario.create({data:{email,nome:'Rollback'}})
        await tx.identidadeGoogle.create({data:{sub:linked.sub,usuarioId:user.id}})
      }))
      assert.equal(await env.db.usuario.count({where:{email}}),0)
    })
  } finally { await env.close() }
})
