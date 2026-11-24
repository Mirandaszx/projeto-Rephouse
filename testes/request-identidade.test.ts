import 'dotenv/config'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { SignJWT } from 'jose'
import { abrirRequestSpec, contextoCasa, password, secret, type Session, type Schemas } from './auxiliares/request-spec.js'
import { URL_TESTES_LOCAL, validarDestinoTestes } from '../ferramentas/integracao/destino-testes.js'

describe('Proteção do ambiente de testes', () => {
  it('quando o destino não é exclusivo de testes, então recusa antes de conectar', () => {
    for (const value of [undefined, 'inválida', URL_TESTES_LOCAL.replace(':5544', ':5432'), URL_TESTES_LOCAL.replace('rabbu_mvp_test', 'rabbu_mvp'),
      URL_TESTES_LOCAL.replace('127.0.0.1', 'banco.externo.test'), URL_TESTES_LOCAL.replace('rephouse_interface_test:', 'equipe:'),
      URL_TESTES_LOCAL + '&options=-csearch_path=public', URL_TESTES_LOCAL.replace('schema=public', 'schema=equipe')]) {
      assert.throws(() => validarDestinoTestes(value, false))
    }
    assert.equal(validarDestinoTestes(URL_TESTES_LOCAL, false).port, '5544')
    assert.throws(() => validarDestinoTestes('postgresql://rephouse_ci:teste@localhost:5432/rabbu_mvp_test', false))
    assert.equal(validarDestinoTestes('postgresql://rephouse_ci:teste@localhost:5432/rabbu_mvp_test', true).username, 'rephouse_ci')
  })
})

describe('Cadastro, sessão e perfil pelas rotas reais', () => {
  it('quando dois cadastros usam o mesmo e-mail, então mantém uma solicitação e só cria conta após confirmar', async () => {
    const c = await abrirRequestSpec()
    try {
      const email = `${randomUUID()}@request.rephouse.test`, input = { nome: 'Concorrência', email, senha: password }
      const results = await Promise.all([c.request('POST', '/api/auth/register', undefined, input), c.request('POST', '/api/auth/register', undefined, input)])
      assert.deepEqual(results.map(result => result.status), [202, 202])
      assert.equal(await c.db.usuario.count({ where: { email } }), 0)
      assert.equal(c.mailbox.messages.filter(message => message.to === email).length, 1)
      // As requisições têm cookies diferentes: utilizar o cookie da mensagem realmente enviada.
      const pending = await c.db.linkEmail.findFirstOrThrow({ where: { email } })
      const cookies = results.map(result => result.headers.get('set-cookie')!.split(';')[0]!)
      const { createHash } = await import('node:crypto')
      const cookie = cookies.find(value => createHash('sha256').update(value.split('=')[1]!).digest('hex') === pending.cookieHash)!
      const response = await c.request<Session>('POST', '/api/auth/email/confirmar', undefined, c.mailbox.proof(email), undefined, { Cookie: cookie })
      assert.equal(response.status, 200)
      const created = response.body
      assert.equal(await c.db.usuario.count({ where: { email } }), 1)
      assert.equal(created.usuario.tipoUsuario, 'USUARIO_NORMAL')
      assert.equal((await c.request<Schemas['MinhaConta']>('GET', '/api/me', created.token)).body.membro, null)
    } finally { await c.close() }
  })
  it('quando os campos ou privilégios de cadastro são inválidos, então não cria conta', async () => {
    const c = await abrirRequestSpec()
    try {
      const email = `${randomUUID()}@request.rephouse.test`
      for (const changes of [{ nome: '' }, { email: 'inválido' }, { senha: '123' }, { tipoUsuario: 'USUARIO_MASTER' }]) {
        assert.equal((await c.request('POST', '/api/auth/register', undefined, { nome: 'Pessoa', email, senha: password, ...changes })).status, 400)
      }
      assert.equal(await c.db.usuario.count({ where: { email } }), 0)
    } finally { await c.close() }
  })
  it('quando altera seu nome, então preserva outra conta e rejeita campos de privilégio', async () => {
    const c = await abrirRequestSpec()
    try {
      const a = await c.account('ana'), b = await c.account('bruno')
      const before = (await c.request<Schemas['MinhaConta']>('GET', '/api/me', b.token)).body
      assert.equal((await c.request('PATCH', '/api/me', a.token, { nome: 'Nome atualizado' })).status, 200)
      assert.equal((await c.request<Schemas['MinhaConta']>('GET', '/api/me', a.token)).body.nome, 'Nome atualizado')
      assert.deepEqual((await c.request<Schemas['MinhaConta']>('GET', '/api/me', b.token)).body, before)
      for (const body of [{ usuarioId: b.usuario.id, nome: 'Invasão' }, { tipoUsuario: 'USUARIO_MASTER' }, { email: b.usuario.email }]) {
        assert.equal((await c.request('PATCH', '/api/me', a.token, body)).status, 400)
      }
    } finally { await c.close() }
  })
  it('quando faz logout, então revoga também a segunda sessão e não envia corpo no 204', async () => {
    const c = await abrirRequestSpec()
    try {
      const a = await c.account('ana'), b = await c.account('ana')
      const response = await c.request('POST', '/api/auth/logout', a.token)
      assert.equal(response.status, 204); assert.equal(response.body, undefined)
      for (const token of [a.token, b.token]) assert.equal((await c.request('GET', '/api/me', token)).status, 401)
    } finally { await c.close() }
  })
  it('quando o token está ausente, adulterado ou expirado, então não autoriza operações privadas', async () => {
    const c = await abrirRequestSpec()
    try {
      const a = await c.account('ana')
      const expired = await new SignJWT({ ver: 0 }).setProtectedHeader({ alg: 'HS256' }).setSubject(a.usuario.id)
        .setIssuer('rephouse').setAudience('rephouse-api').setIssuedAt(Math.floor(Date.now() / 1000) - 120)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(new TextEncoder().encode(secret))
      for (const token of [undefined, 'adulterado', expired]) {
        assert.equal((await c.request('GET', '/api/me', token)).status, 401)
        assert.equal((await c.request('POST', '/api/republicas', token, { nome: 'Invasão' })).status, 401)
      }
      assert.equal(await c.db.republica.count(), 0)
    } finally { await c.close() }
  })
  it('quando a conta está bloqueada ou excluída, então não permite login por senha', async () => {
    const c = await abrirRequestSpec()
    try {
      const a = await c.account('ana'), master = await c.account('master')
      assert.equal((await c.request('PATCH', `/api/master/usuarios/${a.usuario.id}/status`, master.token, { ativo: false })).status, 200)
      assert.equal((await c.request('POST', '/api/auth/login', undefined, { email: a.usuario.email, senha: password })).status, 401)
      assert.equal((await c.request('PATCH', `/api/master/usuarios/${a.usuario.id}/status`, master.token, { ativo: true })).status, 200)
      const renewed = await c.account('ana')
      assert.equal((await c.request('DELETE', '/api/me', renewed.token, { senha: password })).status, 204)
      assert.equal((await c.request('POST', '/api/auth/login', undefined, { email: a.usuario.email, senha: password })).status, 401)
    } finally { await c.close() }
  })
  it('quando o e-mail não existe ou a senha está errada, então responde de forma idêntica', async () => {
    const c = await abrirRequestSpec()
    try {
      const a = await c.account('ana')
      const missing = await c.request('POST', '/api/auth/login', undefined, { email: `${randomUUID()}@request.rephouse.test`, senha: password })
      const wrong = await c.request('POST', '/api/auth/login', undefined, { email: a.usuario.email, senha: `${password}-errada` })
      assert.equal(missing.status, 401); assert.equal(wrong.status, 401)
      assert.deepEqual(missing.body, wrong.body)
    } finally { await c.close() }
  })
})

describe('Limite de autenticação atrás de proxy', () => {
  const tentar = (c: Awaited<ReturnType<typeof abrirRequestSpec>>, ip: string) =>
    c.request('POST', '/api/auth/login', undefined, { email: `ausente-${randomUUID()}@request.rephouse.test`, senha: password }, undefined, { 'X-Forwarded-For': ip })
  it('quando confia em um proxy, então cada cliente tem o próprio limite', async () => {
    const c = await abrirRequestSpec(undefined, { trustProxy: 1 })
    try {
      for (let i = 0; i < 20; i++) assert.equal((await tentar(c, '203.0.113.10')).status, 401)
      const limited = await tentar(c, '203.0.113.10')
      assert.equal(limited.status, 429); assert.ok(limited.headers.get('retry-after'))
      assert.equal((await tentar(c, '203.0.113.20')).status, 401)
    } finally { await c.close() }
  })
  it('quando não confia em proxy, então ignora o cabeçalho enviado pelo cliente', async () => {
    const c = await abrirRequestSpec()
    try {
      for (let i = 0; i < 20; i++) assert.equal((await tentar(c, `203.0.113.${i + 1}`)).status, 401)
      assert.equal((await tentar(c, '203.0.113.99')).status, 429)
    } finally { await c.close() }
  })
})

describe('Vínculos, permissões e tarefas', () => {
  it('quando o código é inválido ou a república está bloqueada, então não cria vínculo; a troca inválida preserva o anterior', async () => {
    const c = await contextoCasa()
    try {
      const carla = await c.account('carla')
      assert.equal((await c.request('POST', '/api/republicas/entrar', carla.token, { codigoEntrada: 'INVALIDO' })).status, 404)
      assert.equal((await c.request('POST', '/api/republicas/trocar', c.ana.token, { codigoEntrada: 'INVALIDO' })).status, 404)
      assert.equal((await c.request<Schemas['MinhaConta']>('GET', '/api/me', c.ana.token)).body.membro?.id, c.anaMember.id)
      assert.equal((await c.request('PATCH', `/api/master/republicas/${c.otherHouse.id}/status`, c.master.token, { ativa: false })).status, 200)
      assert.equal((await c.request('POST', '/api/republicas/entrar', carla.token, { codigoEntrada: c.otherHouse.codigoEntrada })).status, 404)
      assert.equal((await c.request<Schemas['MinhaConta']>('GET', '/api/me', carla.token)).body.membro, null)
      assert.equal((await c.request('PATCH', '/api/republicas/atual', c.ana.token, { nome: 'Invasão' })).status, 403)
      assert.equal((await c.request('PATCH', `/api/membros/${c.brunoMember.id}`, c.ana.token, { ativo: false })).status, 403)
      assert.equal((await c.request('PATCH', `/api/membros/${c.brunoMember.id}`, c.admin.token, { ativo: false })).status, 200)
      assert.equal((await c.request('POST', '/api/republicas/transferir-admin', c.admin.token, { membroId: c.brunoMember.id })).status, 404)
    } finally { await c.close() }
  })
  it('quando duas criações de república concorrem, então mantém somente uma república e um vínculo', async () => {
    const c = await abrirRequestSpec()
    try {
      const a = await c.account('ana')
      const results = await Promise.all([1, 2].map(() => c.request('POST', '/api/republicas', a.token, { nome: 'Casa concorrente' })))
      assert.deepEqual(results.map(result => result.status).sort(), [201, 409])
      assert.equal(await c.db.republica.count(), 1)
      assert.equal(await c.db.membroRepublica.count({ where: { usuarioId: a.usuario.id, ativo: true } }), 1)
    } finally { await c.close() }
  })
  it('quando duas entradas concorrem, então mantém apenas um vínculo ativo', async () => {
    const c = await abrirRequestSpec()
    try {
      const admin = await c.account('adminAurora'), a = await c.account('ana'), house = await c.house(admin)
      const results = await Promise.all([1, 2].map(() => c.request('POST', '/api/republicas/entrar', a.token, { codigoEntrada: house.codigoEntrada })))
      assert.deepEqual(results.map(result => result.status).sort(), [201, 409])
      assert.equal(await c.db.membroRepublica.count({ where: { usuarioId: a.usuario.id, ativo: true } }), 1)
    } finally { await c.close() }
  })
  it('quando transfere a administração enquanto desativa o substituto, então uma operação conflita e o administrador permanece ativo', async () => {
    const c = await contextoCasa()
    try {
      const results = await Promise.all([
        c.request('POST', '/api/republicas/transferir-admin', c.admin.token, { membroId: c.anaMember.id }),
        c.request('PATCH', `/api/membros/${c.anaMember.id}`, c.admin.token, { ativo: false }),
      ])
      const transfer = results[0]!, deactivate = results[1]!
      if (transfer.status === 200) {
        assert.equal(deactivate.status, 403)
        assert.equal((await c.request<Schemas['MinhaConta']>('GET', '/api/me', c.ana.token)).body.tipoUsuario, 'USUARIO_ADMIN')
      } else {
        assert.equal(transfer.status, 404); assert.equal(deactivate.status, 200)
      }
      const house = await c.db.republica.findUniqueOrThrow({ where: { id: c.house.id } })
      assert.equal(await c.db.membroRepublica.count({ where: { republicaId: house.id, usuarioId: house.adminId, ativo: true } }), 1)
    } finally { await c.close() }
  })
  it('quando repete a conclusão da própria tarefa, então permanece concluída sem duplicações', async () => {
    const c = await contextoCasa()
    try {
      const created = await c.request<Schemas['Tarefa']>('POST', '/api/tarefas', c.admin.token, { titulo: 'Limpar cozinha', responsavelId: c.anaMember.id })
      assert.equal(created.status, 201)
      for (let i = 0; i < 2; i++) assert.equal((await c.request<Schemas['Tarefa']>('PATCH', `/api/tarefas/${created.body.id}`, c.ana.token, { status: 'CONCLUIDA' })).body.status, 'CONCLUIDA')
      const listed = await c.request<{ dados: Schemas['Tarefa'][] }>('GET', '/api/tarefas', c.ana.token)
      assert.equal(listed.body.dados.length, 1)
      assert.equal((await c.request('PATCH', `/api/tarefas/${created.body.id}`, c.bruno.token, { status: 'CONCLUIDA' })).status, 403)
      assert.equal((await c.request('PATCH', `/api/tarefas/${created.body.id}`, c.other.token, { status: 'CONCLUIDA' })).status, 404)
    } finally { await c.close() }
  })
  it('quando o administrador edita título, prazo e responsável, então persiste os campos e rejeita responsável inativo', async () => {
    const c = await contextoCasa()
    try {
      const created = await c.request<Schemas['Tarefa']>('POST', '/api/tarefas', c.admin.token, { titulo: 'Original', responsavelId: c.anaMember.id })
      assert.equal(created.status, 201)
      const path = `/api/tarefas/${created.body.id}`
      const edited = await c.request<Schemas['Tarefa']>('PATCH', path, c.admin.token, { titulo: 'Título alterado', responsavelId: c.brunoMember.id, prazo: '2099-02-28' })
      assert.equal(edited.status, 200); assert.equal(edited.body.titulo, 'Título alterado'); assert.equal(edited.body.responsavelId, c.brunoMember.id)
      assert.equal(edited.body.prazo, '2099-02-28T00:00:00.000Z')
      assert.equal((await c.request('PATCH', `/api/membros/${c.anaMember.id}`, c.admin.token, { ativo: false })).status, 200)
      assert.equal((await c.request('PATCH', path, c.admin.token, { responsavelId: c.anaMember.id })).status, 400)
      assert.equal((await c.request('POST', '/api/tarefas', c.admin.token, { titulo: 'Inválida', responsavelId: c.anaMember.id })).status, 400)
      assert.equal((await c.request('PATCH', path, c.admin.token, { responsavelId: c.foreign.id })).status, 400)
      const tasks = (await c.request<{ dados: Schemas['Tarefa'][] }>('GET', '/api/tarefas', c.admin.token)).body.dados
      assert.equal(tasks.length, 1); assert.equal(tasks[0]!.responsavelId, c.brunoMember.id)
    } finally { await c.close() }
  })
})
