import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { createApp } from '../../codigo/app.js'
import { abrirAmbienteIntegracao, emailIntegracao } from '../../ferramentas/integracao/ambiente.js'
import { validarDestinoTestes } from '../../ferramentas/integracao/destino-testes.js'
import { validarResposta } from './contrato.js'
import type { components } from '../../integracao/api.js'
import type { GoogleOptions } from '../../codigo/modulos/autenticacao/google.service.js'
import { testMailbox } from './email.js'

export type Schemas = components['schemas']
export type Session = Schemas['Sessao']
export type Expense = Schemas['Despesa']
export type Member = Schemas['Membro']
export type Page<T> = { dados: T[]; paginacao: { pagina: number; limite: number; totalItens: number; totalPaginas: number } }
export const password = 'Senha-exclusiva-request-spec-2026!'
export const secret = 'segredo-exclusivo-request-spec-com-mais-de-32-caracteres'

export async function abrirRequestSpec(google?: GoogleOptions, opcoes: { trustProxy?: number } = {}) {
  validarDestinoTestes(process.env.TEST_DATABASE_URL)
  const env = await abrirAmbienteIntegracao(process.env.TEST_DATABASE_URL, password)
  const logs: Record<string, unknown>[] = []
  const mailbox = testMailbox()
  const server = createApp({ database: env.db, jwtSecret: secret, corsOrigins: ['http://localhost:5173'], google, email: mailbox.options, log: event => { logs.push(event) }, ...opcoes }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  let emailCookie = ''
  async function request<T = { error: { code: string; message: string } }>(method: string, path: string, token?: string, data?: unknown, key?: string, extraHeaders: Record<string, string> = {}) {
    const form = data instanceof FormData
    const response = await fetch(base + path, {
      method, signal: AbortSignal.timeout(15000),
      headers: { Origin: 'http://localhost:5173', Cookie: emailCookie, ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data !== undefined && !form ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}), ...extraHeaders },
      body: data === undefined ? undefined : form ? data : JSON.stringify(data),
    })
    const setCookie = response.headers.getSetCookie().find(value => value.startsWith('rephouse_email='))
    if (setCookie) emailCookie = setCookie.split(';')[0]!
    const text = await response.text()
    const body: T = text ? JSON.parse(text) : undefined
    assert.match(response.headers.get('x-request-id') ?? '', /^[a-f0-9-]{36}$/)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.doesNotMatch(text, /"(?:senhaHash|versaoToken|hashRequisicao|chaveIdempotencia|conteudo|cookieHash|nonceHash)"/)
    // O adaptador possui contrato de coleção próprio; as demais respostas usam o OpenAPI canônico.
    if (!path.startsWith('/api/front/v1')) validarResposta(method, path, response.status, body)
    if (response.status === 204) assert.equal(text, '')
    return { status: response.status, body, headers: response.headers }
  }
  async function account(conta: Parameters<typeof emailIntegracao>[0]) {
    const result = await request<Session>('POST', '/api/auth/login', undefined, { email: emailIntegracao(conta), senha: password })
    assert.equal(result.status, 200)
    return result.body
  }
  async function register() {
    const email = `${randomUUID()}@request.rephouse.test`
    const result = await request('POST', '/api/auth/register', undefined, { nome: 'Pessoa fictícia', email, senha: password })
    assert.equal(result.status, 202)
    const confirmed = await request<Session>('POST', '/api/auth/email/confirmar', undefined, mailbox.proof(email))
    assert.equal(confirmed.status, 200)
    return confirmed.body
  }
  async function house(admin: Session) {
    const result = await request<Schemas['Republica']>('POST', '/api/republicas', admin.token, { nome: 'Casa request spec' })
    assert.equal(result.status, 201)
    return result.body
  }
  async function join(user: Session, codigoEntrada: string) {
    const result = await request<Member>('POST', '/api/republicas/entrar', user.token, { codigoEntrada })
    assert.equal(result.status, 201)
    return result.body
  }
  async function members(admin: Session) {
    const result = await request<Page<Member>>('GET', '/api/membros', admin.token)
    assert.equal(result.status, 200)
    return result.body.dados
  }
  async function expense(admin: Session, membroIds: string[], changes: Record<string, unknown> = {}) {
    const result = await request<Expense>('POST', '/api/despesas', admin.token, {
      titulo: 'Conta request spec', categoria: 'Casa', valorTotal: '100.00', vencimento: '2099-01-31', membroIds, ...changes,
    })
    assert.equal(result.status, 201)
    return result.body
  }
  async function close() {
    server.closeAllConnections()
    try { if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
    finally { await env.close() }
  }
  return { ...env, server, base, logs, mailbox, emailCookie: () => emailCookie, request, account, register, house, join, members, expense, close }
}

export async function contextoCasa() {
  const env = await abrirRequestSpec()
  try {
    const admin = await env.account('adminAurora'), ana = await env.account('ana')
    const bruno = await env.account('bruno'), other = await env.account('adminHorizonte'), master = await env.account('master')
    const house = await env.house(admin), otherHouse = await env.house(other)
    const anaMember = await env.join(ana, house.codigoEntrada), brunoMember = await env.join(bruno, house.codigoEntrada)
    const own = (await env.members(admin)).find(member => member.usuarioId === admin.usuario.id)!
    const foreign = (await env.members(other))[0]!
    return { ...env, admin, ana, bruno, other, master, house, otherHouse, anaMember, brunoMember, own, foreign }
  } catch (error) { await env.close(); throw error }
}

export function multipart(rateioId: string, bytes = Buffer.from('%PDF-1.4\ncomprovante ficticio\n%%EOF'), valor = '10.00') {
  const form = new FormData()
  form.set('rateioId', rateioId); form.set('valor', valor)
  form.set('comprovante', new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), 'comprovante.pdf')
  return form
}
