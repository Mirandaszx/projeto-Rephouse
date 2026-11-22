import 'dotenv/config'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { contextoCasa, type Expense } from './auxiliares/request-spec.js'
import { iniciarApiCompilada, httpProcesso } from './auxiliares/processo-api.js'
import { abrirSchemaAuditoria, registros } from './auxiliares/schema.js'
import { readFile } from 'node:fs/promises'

describe('Entradas monetárias pelas rotas reais', () => {
  it('quando normaliza dinheiro e ordem dos participantes, então recupera a mesma despesa e preserva os centavos', async () => {
    const c = await contextoCasa()
    try {
      const key = randomUUID()
      const body = { titulo: 'Rateio exato', categoria: 'Casa', valorTotal: '100.0', vencimento: '2099-01-31', membroIds: [c.own.id, c.anaMember.id, c.brunoMember.id] }
      const first = await c.request<Expense>('POST', '/api/despesas', c.admin.token, body, key)
      const replay = await c.request<Expense>('POST', '/api/despesas', c.admin.token, { ...body, valorTotal: '100.00', membroIds: [...body.membroIds].reverse() }, key)
      assert.equal(first.status, 201); assert.equal(replay.status, 201)
      assert.deepEqual(replay.body, first.body)
      assert.deepEqual(first.body.rateios.map(row => row.valorDevido).sort(), ['33.33', '33.33', '33.34'])
      assert.equal(await c.db.despesa.count(), 1)
      assert.equal(await c.db.operacaoCriacao.count(), 1)
    } finally { await c.close() }
  })
  it('quando o valor é inválido, então despesas, edição, pagamentos e recorrências retornam 400 sem gravação', async () => {
    const c = await contextoCasa()
    try {
      const expense = await c.expense(c.admin, [c.own.id])
      const original = await c.db.despesa.findUniqueOrThrow({ where: { id: expense.id } })
      const preflight = await fetch(c.base + '/api/despesas', { method: 'OPTIONS', headers: {
        Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type,idempotency-key',
      } })
      assert.equal(preflight.status, 204)
      assert.match(preflight.headers.get('access-control-allow-headers') ?? '', /Idempotency-Key/i)
      assert.match(preflight.headers.get('access-control-expose-headers') ?? '', /X-Request-Id/i)
      const body = { titulo: 'Conta válida', categoria: 'Casa', vencimento: '2099-01-31', membroIds: [c.own.id] }
      for (const value of ['1,00', 'texto', '', '0', '-1.00', '1.001', '10000000000.00', 'NaN', 'Infinity', 10, null]) {
        for (const [method, path, data] of [
          ['POST', '/api/despesas', { ...body, valorTotal: value }],
          ['PATCH', `/api/despesas/${expense.id}`, { valorTotal: value }],
          ['POST', '/api/pagamentos', { rateioId: expense.rateios[0]!.id, valor: value }],
          ['POST', '/api/recorrencias', { titulo: body.titulo, categoria: body.categoria, membroIds: body.membroIds,
            valorTotal: value, inicio: '2099-01', diaVencimento: 31 }],
        ] as const) {
          const result = await c.request(method, path, c.admin.token, data, randomUUID())
          assert.equal(result.status, 400, `${method} ${path}: ${JSON.stringify(value)}`)
          assert.equal(result.body.error.code, 'VALIDATION_ERROR')
        }
      }
      assert.deepEqual(await c.db.despesa.findUniqueOrThrow({ where: { id: expense.id } }), original)
      assert.equal(await c.db.despesa.count(), 1)
      assert.equal(await c.db.pagamento.count(), 0)
      assert.equal(await c.db.recorrenciaDespesa.count(), 0)
      const valid = await c.request<Expense>('POST', '/api/despesas', c.admin.token, { ...body, valorTotal: '0.01' })
      assert.equal(valid.status, 201)
      assert.equal(valid.body.valorTotal, '0.01')
    } finally { await c.close() }
  })
})

for (const kind of ['despesas', 'tarefas'] as const) {
  const payload = (member: string) => kind === 'despesas'
    ? { titulo: 'Criação protegida', categoria: 'Casa', valorTotal: '10.00', vencimento: '2099-01-31', membroIds: [member] }
    : { titulo: 'Criação protegida', responsavelId: member, prazo: '2099-01-31' }
  describe(`${kind}: recuperação e limites da identidade da operação`, () => {
    it('quando omite a chave, então preserva compatibilidade; quando informa chave inválida, então rejeita sem escrita', async () => {
      const c = await contextoCasa()
      try {
        for (const key of ['', 'invalida', '123']) {
          assert.equal((await c.request('POST', `/api/${kind}`, c.admin.token, payload(c.own.id), undefined, { 'Idempotency-Key': key })).status, 400)
        }
        assert.equal(await c.db.operacaoCriacao.count(), 0)
        for (let i = 0; i < 2; i++) assert.equal((await c.request('POST', `/api/${kind}`, c.admin.token, payload(c.own.id))).status, 201)
        assert.equal(await c.db.operacaoCriacao.count(), 0)
        assert.equal(kind === 'despesas' ? await c.db.despesa.count() : await c.db.tarefa.count(), 2)
      } finally { await c.close() }
    })
    it('quando reutiliza a chave concorrente com dados distintos, então confirma uma criação e um conflito', async () => {
      const c = await contextoCasa()
      try {
        const key = randomUUID(), body = payload(c.own.id)
        const results = await Promise.all([body, { ...body, titulo: 'Outro conteúdo' }].map(data => c.request('POST', `/api/${kind}`, c.admin.token, data, key)))
        assert.deepEqual(results.map(result => result.status).sort(), [201, 409])
        assert.equal(await c.db.operacaoCriacao.count(), 1)
        assert.equal(kind === 'despesas' ? await c.db.despesa.count() : await c.db.tarefa.count(), 1)
      } finally { await c.close() }
    })
    it('quando o registro foi editado, então reenvio retorna o corpo original; o adaptador compartilha a operação', async () => {
      const c = await contextoCasa()
      try {
        const key = randomUUID(), body = payload(c.own.id)
        const first = await c.request<{ id: string; titulo: string }>('POST', `/api/${kind}`, c.admin.token, body, key)
        assert.equal(first.status, 201)
        assert.equal((await c.request('PATCH', `/api/${kind}/${first.body.id}`, c.admin.token, { titulo: 'Editado posteriormente' })).status, 200)
        const replay = await c.request('POST', `/api/front/v1/${kind}`, c.admin.token, body, key)
        assert.equal(replay.status, 201)
        assert.deepEqual(replay.body, first.body)
        assert.notEqual(first.headers.get('x-request-id'), replay.headers.get('x-request-id'))
        const record = kind === 'despesas' ? await c.db.despesa.findUniqueOrThrow({ where: { id: first.body.id } }) : await c.db.tarefa.findUniqueOrThrow({ where: { id: first.body.id } })
        assert.equal(record.titulo, 'Editado posteriormente')
      } finally { await c.close() }
    })
    it('quando transfere administração e revoga sessão, então a chave anterior não contorna autorização', async () => {
      const c = await contextoCasa()
      try {
        const key = randomUUID(), body = payload(c.anaMember.id)
        assert.equal((await c.request('POST', `/api/${kind}`, c.admin.token, body, key)).status, 201)
        assert.equal((await c.request('POST', '/api/republicas/transferir-admin', c.admin.token, { membroId: c.anaMember.id })).status, 200)
        assert.equal((await c.request('POST', `/api/${kind}`, c.admin.token, body, key)).status, 403)
        assert.equal((await c.request('POST', '/api/auth/logout', c.admin.token, {})).status, 204)
        assert.equal((await c.request('POST', `/api/${kind}`, c.admin.token, body, key)).status, 401)
        assert.equal(await c.db.operacaoCriacao.count(), 1)
      } finally { await c.close() }
    })
    it('quando MASTER muda o destino, então reutilizar sua chave conflita; outro usuário não recebe a resposta alheia', async () => {
      const c = await contextoCasa()
      try {
        const key = randomUUID()
        const path = `/api/master/republicas/${c.house.id}/${kind}`
        const first = await c.request<{ id: string }>('POST', path, c.master.token, payload(c.own.id), key)
        assert.equal(first.status, 201)
        assert.equal((await c.request('POST', `/api/master/republicas/${c.otherHouse.id}/${kind}`, c.master.token, payload(c.foreign.id), key)).status, 409)
        const other = await c.request<{ id: string }>('POST', `/api/${kind}`, c.admin.token, payload(c.own.id), key)
        assert.equal(other.status, 201)
        assert.notEqual(first.body.id, other.body.id)
        assert.equal((await c.request('POST', path, c.ana.token, payload(c.own.id), key)).status, 403)
        assert.equal(await c.db.operacaoCriacao.count(), 2)
      } finally { await c.close() }
    })
    it('quando PostgreSQL rejeita o controle da operação, então reverte também o registro e permite repetir após a falha', async () => {
      const c = await contextoCasa()
      try {
        await c.db.$executeRawUnsafe(`CREATE FUNCTION rejeitar_criacao_teste() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Rejeicao real de teste' USING ERRCODE='23514'; END $$`)
        await c.db.$executeRawUnsafe('CREATE TRIGGER rejeitar_criacao_teste BEFORE INSERT ON operacoes_criacao FOR EACH ROW EXECUTE FUNCTION rejeitar_criacao_teste()')
        const key = randomUUID(), body = payload(c.own.id)
        assert.equal((await c.request('POST', `/api/${kind}`, c.admin.token, body, key)).status, 400)
        assert.equal(await c.db.operacaoCriacao.count(), 0)
        assert.equal(await c.db.despesa.count(), 0)
        assert.equal(await c.db.rateioDespesa.count(), 0)
        assert.equal(await c.db.tarefa.count(), 0)
        await c.db.$executeRawUnsafe('DROP TRIGGER rejeitar_criacao_teste ON operacoes_criacao')
        await c.db.$executeRawUnsafe('DROP FUNCTION rejeitar_criacao_teste()')
        assert.equal((await c.request('POST', `/api/${kind}`, c.admin.token, body, key)).status, 201)
      } finally { await c.close() }
    })
    it('quando a API reinicia, então recupera a criação confirmada sem duplicar', async () => {
      const c = await contextoCasa()
      let process: Awaited<ReturnType<typeof iniciarApiCompilada>> | undefined
      try {
        const key = randomUUID(), body = payload(c.own.id)
        process = await iniciarApiCompilada(c.schema)
        const first = await httpProcesso(process.base, 'POST', `/api/${kind}`, c.admin.token, body, key)
        assert.equal(first.status, 201)
        await process.stop(); process = undefined
        process = await iniciarApiCompilada(c.schema)
        const replay = await httpProcesso(process.base, 'POST', `/api/${kind}`, c.admin.token, body, key)
        assert.equal(replay.status, 201)
        assert.deepEqual(replay.body, first.body)
        assert.equal(await c.db.operacaoCriacao.count(), 1)
      } finally { await process?.stop(); await c.close() }
    })
  })
}

describe('Migration de identidade das criações', () => {
  it('quando migra dados anteriores, então preserva registros/comprovantes; reversão vazia funciona e reversão com histórico é recusada', async () => {
    const c = await abrirSchemaAuditoria(true)
    const directory = 'prisma/migracoes/202611200001_idempotencia_criacoes'
    try {
      const before = await registros(c.db)
      const up = await readFile(`${directory}/migration.sql`, 'utf8')
      const down = await readFile(`${directory}/down.sql`, 'utf8')
      await c.db.query(up)
      const { operacoes_criacao: empty, ...after } = await registros(c.db)
      assert.deepEqual(empty, [])
      assert.deepEqual(after, before)
      await c.db.query(down)
      assert.deepEqual(await registros(c.db), before)
      await c.db.query(up)
      await c.db.query(`INSERT INTO operacoes_criacao(usuario_id,operacao,chave,republica_id,hash_requisicao,despesa_id,resposta)
        VALUES($1,'DESPESA',$2,$3,repeat('a',64),$4::uuid,jsonb_build_object('id',$4::uuid::text))`, [c.ids.admin, randomUUID(), c.ids.casa, c.ids.despesa])
      const stored = await registros(c.db)
      for (const sql of ['UPDATE operacoes_criacao SET hash_requisicao=repeat(\'b\',64)', 'DELETE FROM operacoes_criacao']) {
        await assert.rejects(c.db.query(sql), (error: unknown) => !!error && typeof error === 'object' && 'code' in error && error.code === 'RH001')
      }
      await assert.rejects(c.db.query(down), (error: unknown) => !!error && typeof error === 'object' && 'code' in error && error.code === 'P0001')
      await c.db.query('ROLLBACK')
      assert.deepEqual(await registros(c.db), stored)
    } finally { await c.close() }
  })
})
