import 'dotenv/config'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { contextoCasa } from './auxiliares/request-spec.js'

// Especificação aprovada e preservada na correção 2.2.1: não ignorar nem enfraquecer os cenários.
for (const kind of ['despesas', 'tarefas'] as const) {
  describe(`Criação de ${kind}: identidade da operação`, () => {
    const input = (memberId: string) => kind === 'despesas'
      ? { titulo: 'Criação intencional', categoria: 'Casa', valorTotal: '100.00', vencimento: '2099-01-31', membroIds: [memberId] }
      : { titulo: 'Criação intencional', responsavelId: memberId, prazo: '2099-01-31' }
    it('quando reenvia a mesma chave e os mesmos dados, então retorna o registro original', async () => {
      const c = await contextoCasa()
      try {
        const key = randomUUID(), body = input(c.anaMember.id)
        const first = await c.request<{ id: string }>('POST', `/api/${kind}`, c.admin.token, body, key)
        const replay = await c.request<{ id: string }>('POST', `/api/${kind}`, c.admin.token, body, key)
        assert.equal(first.status, 201); assert.equal(replay.status, 201)
        assert.equal(replay.body.id, first.body.id, 'Reenvio deve devolver o ID original')
        assert.equal(kind === 'despesas' ? await c.db.despesa.count() : await c.db.tarefa.count(), 1)
      } finally { await c.close() }
    })
    it('quando duas requisições usam a mesma chave simultaneamente, então grava um único registro', async () => {
      const c = await contextoCasa()
      try {
        const key = randomUUID(), body = input(c.anaMember.id)
        const [a, b] = await Promise.all([1, 2].map(() => c.request<{ id: string }>('POST', `/api/${kind}`, c.admin.token, body, key)))
        assert.equal(a!.status, 201); assert.equal(b!.status, 201)
        assert.equal(kind === 'despesas' ? await c.db.despesa.count() : await c.db.tarefa.count(), 1, 'Concorrência não pode duplicar a operação')
        assert.equal(a!.body.id, b!.body.id)
      } finally { await c.close() }
    })
    it('quando reutiliza a chave com dados diferentes, então retorna 409 sem nova gravação', async () => {
      const c = await contextoCasa()
      try {
        const key = randomUUID(), body = input(c.anaMember.id)
        assert.equal((await c.request('POST', `/api/${kind}`, c.admin.token, body, key)).status, 201)
        const changed = await c.request('POST', `/api/${kind}`, c.admin.token, { ...body, titulo: 'Outro conteúdo' }, key)
        assert.equal(changed.status, 409)
        assert.equal(kind === 'despesas' ? await c.db.despesa.count() : await c.db.tarefa.count(), 1)
      } finally { await c.close() }
    })
    it('quando utiliza uma chave nova com dados iguais, então permite outra criação intencional', async () => {
      const c = await contextoCasa()
      try {
        const body = input(c.anaMember.id)
        const a = await c.request<{ id: string }>('POST', `/api/${kind}`, c.admin.token, body, randomUUID())
        const b = await c.request<{ id: string }>('POST', `/api/${kind}`, c.admin.token, body, randomUUID())
        assert.equal(a.status, 201); assert.equal(b.status, 201); assert.notEqual(a.body.id, b.body.id)
        assert.equal(kind === 'despesas' ? await c.db.despesa.count() : await c.db.tarefa.count(), 2)
      } finally { await c.close() }
    })
  })
}
