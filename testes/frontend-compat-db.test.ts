import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createHash, randomUUID } from 'node:crypto'
import { createApp } from '../codigo/app.js'
import { abrirAmbienteIntegracao, emailIntegracao, type contasIntegracao } from '../ferramentas/integracao/ambiente.js'
import { validarResposta } from './auxiliares/contrato.js'
import { FRONT_PREFIX } from '../codigo/modulos/integracao/frontend-compat.js'
import type { components } from '../integracao/api.js'
import type { Page } from '../codigo/compartilhado/http/pagination.js'

type Schemas = components['schemas']

test('frontend PR #2: integração de ambos os contratos com PostgreSQL real', { timeout: 90000 }, async t => {
  const password = 'Senha-compatibilidade-local-2026!'
  const environment = await abrirAmbienteIntegracao(process.env.TEST_DATABASE_URL, password)
  const http = createApp({ database: environment.db, jwtSecret: 'segredo-exclusivo-dos-testes-de-compatibilidade', log: () => {}, corsOrigins: ['http://localhost:5182'] }).listen(0, '127.0.0.1')
  try {
    await once(http, 'listening')
    const address = http.address(); assert.ok(address && typeof address !== 'string')
    const base = `http://127.0.0.1:${address.port}`
    async function request<T = unknown>(path: string, token?: string, method = 'GET', body?: unknown, status = 200): Promise<T> {
      const response = await fetch(base + path, { method, headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}),
      }, body: body ? JSON.stringify(body) : undefined })
      assert.equal(response.status, status, `${method} ${path}: ${await response.clone().text()}`)
      assert.match(response.headers.get('X-Request-Id') ?? '', /^[a-f0-9-]{36}$/)
      assert.equal(response.headers.get('Cache-Control'), 'no-store')
      const result = status === 204 ? undefined : await response.json()
      validarResposta(method, path, status, result)
      assert.doesNotMatch(JSON.stringify(result) ?? '', /"(?:senhaHash|versaoToken|conteudo|hashRequisicao)"/)
      return result as T
    }
    const login = async (account: keyof typeof contasIntegracao, prefix = FRONT_PREFIX) =>
      (await request<Schemas['Sessao']>(`${prefix}/auth/login`, undefined, 'POST', { email: emailIntegracao(account), senha: password })).token
    const admin = await login('adminAurora'), other = await login('adminHorizonte'), member = await login('ana'), master = await login('master')
    const republic = await request<Schemas['Republica']>(`${FRONT_PREFIX}/republicas`, admin, 'POST', { nome: 'Aurora compatível' }, 201)
    await request('/api/republicas', other, 'POST', { nome: 'Horizonte isolada' }, 201)
    await request(`${FRONT_PREFIX}/republicas/entrar`, member, 'POST', { codigoEntrada: republic.codigoEntrada }, 201)
    const me = await request<Schemas['MinhaConta']>(`${FRONT_PREFIX}/me`, member)
    assert.ok(me.membro)
    const memberId = me.membro.id
    let taskId = ''
    await t.test('cadastro, perfil e contexto usam as mesmas contas nos dois namespaces', async () => {
      const registered = await request<Schemas['Sessao']>(`${FRONT_PREFIX}/auth/register`, undefined, 'POST', { nome: 'Conta teste', email: 'nova@compatibilidade.test', senha: password }, 201)
      assert.equal((await request<Schemas['MinhaConta']>('/api/me', registered.token)).id, registered.usuario.id)
      await request('/api/me', registered.token, 'PATCH', { nome: 'Nome atualizado' })
      assert.equal((await request<Schemas['MinhaConta']>(`${FRONT_PREFIX}/me`, registered.token)).nome, 'Nome atualizado')
      await request(`${FRONT_PREFIX}/me`, registered.token, 'DELETE', { senha: password }, 204)
      await request('/api/me', registered.token, 'GET', undefined, 401)
    })
    await t.test('moradores e 25 tarefas retornam arrays completos e preservam paginação principal', async () => {
      const members = await request<unknown[]>(`${FRONT_PREFIX}/membros`, member)
      assert.equal(members.length, 2)
      for (let index = 0; index < 25; index++) {
        const task = await request<Schemas['Tarefa']>(`${FRONT_PREFIX}/tarefas`, admin, 'POST', { titulo: `Tarefa ${index}`, responsavelId: memberId }, 201)
        taskId = task.id
      }
      assert.equal((await request<unknown[]>(`${FRONT_PREFIX}/tarefas`, member)).length, 25)
      const page = await request<Page<unknown>>('/api/tarefas?pagina=2&limite=20', member)
      assert.equal(page.dados.length, 5)
      assert.equal(page.paginacao.totalItens, 25)
      await request(`${FRONT_PREFIX}/tarefas/${taskId}`, member, 'PATCH', { status: 'CONCLUIDA' })
      assert.equal((await environment.db.tarefa.findUniqueOrThrow({ where: { id: taskId } })).status, 'CONCLUIDA')
    })
    await t.test('autorização, isolamento, filtro de inativos e contexto MASTER permanecem ativos', async () => {
      await request(`${FRONT_PREFIX}/master/usuarios`, member, 'GET', undefined, 403)
      await request(`${FRONT_PREFIX}/membros?inativos=true`, member, 'GET', undefined, 403)
      await request(`${FRONT_PREFIX}/membros?inativos=true`, admin)
      await request(`${FRONT_PREFIX}/tarefas/${taskId}`, other, 'PATCH', { status: 'CONCLUIDA' }, 404)
      assert.deepEqual(await request(`${FRONT_PREFIX}/tarefas`, other), [])
      for (const path of ['/master/usuarios', '/master/republicas', `/master/republicas/${republic.id}/membros`, `/master/republicas/${republic.id}/tarefas`, `/master/republicas/${republic.id}/despesas`]) {
        assert.ok(Array.isArray(await request(FRONT_PREFIX + path, master)))
        assert.ok(Array.isArray((await request<Page<unknown>>('/api' + path, master)).dados))
      }
      await request(`${FRONT_PREFIX}/dashboard`, member)
      await request(`${FRONT_PREFIX}/master/dashboard`, master)
      await request(`${FRONT_PREFIX}/tarefas?pagina=1`, member, 'GET', undefined, 400)
    })
    await t.test('pagamento multipart mantém idempotência entre namespaces e comprovante protegido', async () => {
      const expense = await request<Schemas['Despesa']>(`${FRONT_PREFIX}/despesas`, admin, 'POST', { titulo: 'Internet', categoria: 'Serviços', valorTotal: '50.00', vencimento: '2030-01-15', membroIds: [memberId] }, 201)
      assert.equal((await request<unknown[]>(`${FRONT_PREFIX}/despesas`, member)).length, 1)
      const key = randomUUID(), bytes = Buffer.from('%PDF-1.4\ncomprovante sintético de integração\n%%EOF')
      let paymentId = ''
      for (const prefix of [FRONT_PREFIX, '/api']) {
        const form = new FormData()
        form.set('rateioId', expense.rateios[0].id); form.set('valor', '20.00')
        form.set('comprovante', new Blob([bytes], { type: 'application/pdf' }), 'comprovante.pdf')
        const response = await fetch(`${base}${prefix}/pagamentos`, { method: 'POST', headers: { Authorization: `Bearer ${member}`, 'Idempotency-Key': key }, body: form })
        assert.equal(response.status, 201, await response.clone().text())
        const payment = await response.json() as Schemas['Pagamento']
        validarResposta('POST', prefix + '/pagamentos', 201, payment)
        if (paymentId) assert.equal(payment.id, paymentId)
        paymentId = payment.id
        assert.equal(payment.comprovanteUrl, `/api/pagamentos/${paymentId}/comprovante`)
      }
      assert.equal(await environment.db.pagamento.count(), 1)
      assert.equal((await environment.db.rateioDespesa.findUniqueOrThrow({ where: { id: expense.rateios[0].id } })).valorPago.toFixed(2), '20.00')
      for (const token of [member, admin, master]) {
        const response = await fetch(`${base}${FRONT_PREFIX}/pagamentos/${paymentId}/comprovante`, { headers: { Authorization: `Bearer ${token}` } })
        assert.equal(response.status, 200)
        assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), createHash('sha256').update(bytes).digest('hex'))
      }
      await request(`${FRONT_PREFIX}/pagamentos/${paymentId}/comprovante`, other, 'GET', undefined, 404)
      assert.equal((await request<unknown[]>(`${FRONT_PREFIX}/me/financeiro`, member)).length, 1)
    })
    await t.test('CORS e logout compartilhado rejeitam token revogado nos dois contratos', async () => {
      const preflight = await fetch(`${base}${FRONT_PREFIX}/tarefas`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5182', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } })
      assert.equal(preflight.status, 204)
      assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5182')
      await request(`${FRONT_PREFIX}/auth/logout`, member, 'POST', {}, 204)
      await request('/api/me', member, 'GET', undefined, 401)
      await request(`${FRONT_PREFIX}/me`, member, 'GET', undefined, 401)
    })
    await t.test('alternar namespaces não contorna o limitador de autenticação', async () => {
      // 4 logins e 1 cadastro acima já consumiram cinco das vinte tentativas.
      for (let index = 0; index < 15; index++) {
        await request(`${index % 2 ? '/api' : FRONT_PREFIX}/auth/login`, undefined, 'POST', { email: 'ausente@compatibilidade.test', senha: password }, 401)
      }
      for (const prefix of ['/api', FRONT_PREFIX]) await request(`${prefix}/auth/login`, undefined, 'POST', { email: emailIntegracao('ana'), senha: password }, 429)
    })
  } finally {
    http.closeAllConnections()
    await new Promise<void>(resolve => http.close(() => resolve()))
    await environment.close()
  }
})
