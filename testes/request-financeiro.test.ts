import 'dotenv/config'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { request as httpRequest } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { contextoCasa, multipart, password, type Expense, type Page, type Schemas } from './auxiliares/request-spec.js'

describe('Despesas, rateio e pagamentos por HTTP', () => {
  it('quando divide R$ 100,00 por três moradores, então conserva exatamente os centavos', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.own.id, c.anaMember.id, c.brunoMember.id])
      assert.deepEqual(bill.rateios.map(share => share.valorDevido).sort(), ['33.33', '33.33', '33.34'])
      assert.equal((await c.request('GET', `/api/despesas/${bill.id}`, c.other.token)).status, 404)
      assert.equal((await c.request('GET', `/api/despesas/${bill.id}`, c.ana.token)).status, 200)
    } finally { await c.close() }
  })
  it('quando valor ou participantes são inválidos, então não grava despesas nem parcelas', async t => {
    const c = await contextoCasa()
    try {
      const base = { titulo: 'Inválida', categoria: 'Casa', valorTotal: '100.00', vencimento: '2099-01-31', membroIds: [c.anaMember.id] }
      const variants = ['0', '-1.00', '1.001', '10000000000.00', 'NaN', '1,00'].map(valorTotal => ({ ...base, valorTotal }))
      variants.push(...[[], [c.anaMember.id, c.anaMember.id], [c.foreign.id]].map(membroIds => ({ ...base, membroIds })),
        { ...base, valorTotal: '0.01', membroIds: [c.own.id, c.anaMember.id] })
      assert.equal((await c.request('PATCH', `/api/membros/${c.brunoMember.id}`, c.admin.token, { ativo: false })).status, 200)
      variants.push({ ...base, membroIds: [c.brunoMember.id] })
      for (const [index, input] of variants.entries()) await t.test(`quando recebe a entrada inválida ${index + 1}, então retorna 400 sem gravar`, async () => {
        assert.equal((await c.request('POST', '/api/despesas', c.admin.token, input)).status, 400, JSON.stringify(input))
        assert.equal(await c.db.despesa.count(), 0); assert.equal(await c.db.rateioDespesa.count(), 0)
      })
      assert.equal((await c.request('POST', '/api/despesas', c.ana.token, base)).status, 403)
      assert.equal(await c.db.despesa.count(), 0); assert.equal(await c.db.rateioDespesa.count(), 0)
    } finally { await c.close() }
  })
  it('quando registra R$ 25,00 de uma parcela de R$ 60,00, então o saldo é R$ 35,00 e a repetição não duplica', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id], { valorTotal: '60.00' }), share = bill.rateios[0]!, key = randomUUID()
      const input = { rateioId: share.id, valor: '25.00' }
      const results = await Promise.all([1, 2].map(() => c.request<Schemas['Pagamento']>('POST', '/api/pagamentos', c.ana.token, input, key)))
      assert.deepEqual(results.map(result => result.status), [201, 201]); assert.equal(results[0]!.body.id, results[1]!.body.id)
      const replay = await c.request<Schemas['Pagamento']>('POST', '/api/pagamentos', c.ana.token, input, key)
      assert.equal(replay.body.id, results[0]!.body.id)
      assert.equal((await c.request('POST', '/api/pagamentos', c.ana.token, { ...input, valor: '26.00' }, key)).status, 409)
      const detail = await c.request<Schemas['RateioPessoal']>('GET', `/api/me/financeiro/${share.id}`, c.ana.token)
      assert.equal(detail.body.valorRestante, '35.00'); assert.equal(detail.body.valorPago, '25.00'); assert.equal(detail.body.pagamentoParcial, true)
      assert.equal(await c.db.pagamento.count(), 1)
    } finally { await c.close() }
  })
  it('quando pagamento é inválido, excede o saldo ou pertence a outra pessoa, então não movimenta dinheiro', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id]), rateioId = bill.rateios[0]!.id
      for (const valor of ['0.00', '-1.00', '0.001']) assert.equal((await c.request('POST', '/api/pagamentos', c.ana.token, { rateioId, valor }, randomUUID())).status, 400)
      assert.equal((await c.request('POST', '/api/pagamentos', c.ana.token, { rateioId, valor: '101.00' }, randomUUID())).status, 409)
      assert.equal((await c.request('POST', '/api/pagamentos', c.ana.token, { rateioId, valor: '10.00' })).status, 400)
      for (const token of [c.admin.token, c.bruno.token, c.other.token, c.master.token]) {
        assert.equal((await c.request('POST', '/api/pagamentos', token, { rateioId, valor: '10.00' }, randomUUID())).status, 404)
      }
      assert.equal(await c.db.pagamento.count(), 0)
    } finally { await c.close() }
  })
  it('quando duas chaves disputam o saldo restante, então somente um pagamento cabe na dívida', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id], { valorTotal: '30.00' }), rateioId = bill.rateios[0]!.id
      const results = await Promise.all([1, 2].map(() => c.request('POST', '/api/pagamentos', c.ana.token, { rateioId, valor: '20.00' }, randomUUID())))
      assert.deepEqual(results.map(result => result.status).sort(), [201, 409])
      assert.equal((await c.request<Schemas['RateioPessoal']>('GET', `/api/me/financeiro/${rateioId}`, c.ana.token)).body.valorRestante, '10.00')
      assert.equal(await c.db.pagamento.count(), 1)
    } finally { await c.close() }
  })
  it('quando a república está bloqueada, então impede novos pagamentos sem alterar o saldo', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id]), rateioId = bill.rateios[0]!.id
      assert.equal((await c.request('PATCH', `/api/master/republicas/${c.house.id}/status`, c.master.token, { ativa: false })).status, 200)
      const result = await c.request('POST', '/api/pagamentos', c.ana.token, { rateioId, valor: '10.00' }, randomUUID())
      assert.equal(result.status, 403); assert.equal(result.body.error.code, 'REPUBLIC_BLOCKED')
      assert.equal(await c.db.pagamento.count(), 0)
      assert.equal((await c.db.rateioDespesa.findUniqueOrThrow({ where: { id: rateioId } })).valorPago.toFixed(2), '0.00')
    } finally { await c.close() }
  })
  it('quando quita a própria parcela, então distingue parcela paga de conta ainda pendente', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id, c.brunoMember.id]), own = bill.rateios.find(share => share.membroId === c.anaMember.id)!
      assert.equal((await c.request('POST', '/api/pagamentos', c.ana.token, { rateioId: own.id, valor: '50.00' }, randomUUID())).status, 201)
      assert.equal((await c.request<Schemas['RateioPessoal']>('GET', `/api/me/financeiro/${own.id}`, c.ana.token)).body.status, 'PAGO')
      assert.equal((await c.request<Expense>('GET', `/api/despesas/${bill.id}`, c.ana.token)).body.status, 'PENDENTE')
      assert.equal((await c.request('PATCH', `/api/despesas/${bill.id}`, c.admin.token, { valorTotal: '120.00' })).status, 409)
      assert.equal((await c.request('PATCH', `/api/despesas/${bill.id}`, c.admin.token, { membroIds: [c.anaMember.id] })).status, 409)
      assert.equal((await c.request('PATCH', `/api/despesas/${bill.id}`, c.admin.token, { titulo: 'Título corrigido', vencimento: '2099-02-01' })).status, 200)
    } finally { await c.close() }
  })
  it('quando tenta excluir a conta com dívida antiga, então preserva a conta e permite quitar após a troca', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id]), rateioId = bill.rateios[0]!.id
      assert.equal((await c.request('POST', '/api/republicas/trocar', c.ana.token, { codigoEntrada: c.otherHouse.codigoEntrada })).status, 200)
      const deleted = await c.request('DELETE', '/api/me', c.ana.token, { senha: password })
      assert.equal(deleted.status, 409); assert.equal(deleted.body.error.code, 'OUTSTANDING_DEBT')
      assert.equal((await c.request('GET', `/api/despesas/${bill.id}`, c.ana.token)).status, 404)
      assert.equal((await c.request('POST', '/api/pagamentos', c.ana.token, { rateioId, valor: '100.00' }, randomUUID())).status, 201)
      assert.equal((await c.request('DELETE', '/api/me', c.ana.token, { senha: password })).status, 204)
      assert.equal(await c.db.pagamento.count(), 1); assert.equal(await c.db.rateioDespesa.count(), 1)
    } finally { await c.close() }
  })
  it('quando uma constraint real rejeita rateios, então o POST reverte também a despesa', async () => {
    const c = await contextoCasa()
    try {
      // Falha real do PostgreSQL, restrita a este schema descartável; nenhum método é substituído.
      await c.db.$executeRawUnsafe('ALTER TABLE rateios_despesa ADD CONSTRAINT request_spec_rejeitar CHECK (false) NOT VALID')
      const result = await c.request('POST', '/api/despesas', c.admin.token, { titulo: 'Rollback', categoria: 'Casa', valorTotal: '10.00', vencimento: '2099-01-31', membroIds: [c.anaMember.id] })
      assert.equal(result.status, 400)
      assert.equal(await c.db.despesa.count(), 0); assert.equal(await c.db.rateioDespesa.count(), 0)
      assert.doesNotMatch(JSON.stringify(result.body), /request_spec_rejeitar|INSERT|SQL|stack|postgresql:/i)
    } finally { await c.close() }
  })
})

describe('Comprovantes por HTTP e PostgreSQL reais', () => {
  it('quando transfere a administração, sai da casa e exclui a conta, então preserva o arquivo e aplica as permissões atuais', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id])
      const paid = await c.request<Schemas['Pagamento']>('POST', '/api/pagamentos', c.ana.token, multipart(bill.rateios[0]!.id, undefined, '100.00'), randomUUID())
      assert.equal(paid.status, 201)
      const path = `/api/pagamentos/${paid.body.id}/comprovante`
      assert.equal((await c.request('POST', '/api/republicas/transferir-admin', c.admin.token, { membroId: c.brunoMember.id })).status, 200)
      assert.equal((await c.request('GET', path, c.admin.token)).status, 404)
      async function download(token: string) {
        const response = await fetch(c.base + path, { headers: { Authorization: `Bearer ${token}` } })
        assert.equal(response.status, 200); assert.equal(await response.text(), '%PDF-1.4\ncomprovante ficticio\n%%EOF')
      }
      await download(c.bruno.token)
      assert.equal((await c.request('POST', '/api/republicas/sair', c.ana.token)).status, 204)
      await download(c.ana.token)
      assert.equal((await c.request('DELETE', '/api/me', c.ana.token, { senha: password })).status, 204)
      assert.equal((await c.request('GET', path, c.ana.token)).status, 401)
      await download(c.bruno.token); await download(c.master.token)
      assert.equal(await c.db.pagamento.count(), 1); assert.equal(await c.db.comprovante.count(), 1)
    } finally { await c.close() }
  })
  it('quando reenvia simultaneamente o mesmo arquivo, então conserva um pagamento, um comprovante e seus bytes', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id]), rateioId = bill.rateios[0]!.id, key = randomUUID()
      const bytes = Buffer.from('%PDF-1.4\ncomprovante original\n%%EOF')
      const results = await Promise.all([1, 2].map(() => c.request<Schemas['Pagamento']>('POST', '/api/pagamentos', c.ana.token, multipart(rateioId, bytes), key)))
      assert.deepEqual(results.map(result => result.status), [201, 201]); assert.equal(results[0]!.body.id, results[1]!.body.id)
      assert.equal(await c.db.pagamento.count(), 1); assert.equal(await c.db.comprovante.count(), 1)
      assert.equal((await c.request('POST', '/api/pagamentos', c.ana.token, multipart(rateioId, Buffer.from('%PDF-1.4\noutro\n%%EOF')), key)).status, 409)
      const id = results[0]!.body.id
      for (const token of [c.ana.token, c.admin.token, c.master.token]) {
        const response = await fetch(`${c.base}/api/pagamentos/${id}/comprovante`, { headers: { Authorization: `Bearer ${token}` } })
        assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'application/pdf')
        assert.equal(response.headers.get('content-length'), String(bytes.length)); assert.equal(response.headers.get('cache-control'), 'no-store')
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff'); assert.match(response.headers.get('content-disposition')!, /comprovante.pdf/)
        assert.ok(response.headers.get('x-request-id')); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes)
      }
      for (const token of [c.bruno.token, c.other.token]) assert.equal((await c.request('GET', `/api/pagamentos/${id}/comprovante`, token)).status, 404)
      const stored = await c.db.comprovante.findUniqueOrThrow({ where: { pagamentoId: id } })
      assert.equal(stored.hashSha256, createHash('sha256').update(bytes).digest('hex'))
      const json = await c.request<Page<Schemas['RateioPessoal']>>('GET', '/api/me/financeiro', c.ana.token)
      assert.equal(json.body.dados[0]!.pagamentos[0]!.comprovanteUrl, `/api/pagamentos/${id}/comprovante`)
      assert.doesNotMatch(JSON.stringify(json.body), /original|\.pdf|\\Downloads|base64|conteudo/)
    } finally { await c.close() }
  })
  it('quando o arquivo é vazio, falso ou excede 5 MiB, então rejeita sem movimentar dinheiro', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id]), rateioId = bill.rateios[0]!.id
      for (const [bytes, status] of [[Buffer.alloc(0), 400], [Buffer.from('não é PDF'), 400], [Buffer.from('GIF89a' + '\0'.repeat(40)), 400], [Buffer.alloc(5 * 1024 * 1024 + 1), 413]] as const) {
        assert.equal((await c.request('POST', '/api/pagamentos', c.ana.token, multipart(rateioId, bytes), randomUUID())).status, status)
      }
      assert.equal(await c.db.pagamento.count(), 0); assert.equal(await c.db.comprovante.count(), 0)
    } finally { await c.close() }
  })
  it('quando o arquivo tem exatamente 5 MiB e assinatura PDF válida, então aceita o upload', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id]), bytes = Buffer.alloc(5 * 1024 * 1024, 65)
      bytes.write('%PDF-1.4\n')
      const result = await c.request<Schemas['Pagamento']>('POST', '/api/pagamentos', c.ana.token, multipart(bill.rateios[0]!.id, bytes), randomUUID())
      assert.equal(result.status, 201)
      assert.equal((await c.db.comprovante.findUniqueOrThrow({ where: { pagamentoId: result.body.id } })).tamanho, bytes.length)
    } finally { await c.close() }
  })
  it('quando o PostgreSQL rejeita o comprovante, então reverte pagamento e saldo juntos', async () => {
    const c = await contextoCasa()
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id]), rateioId = bill.rateios[0]!.id
      await c.db.$executeRawUnsafe('ALTER TABLE comprovantes ADD CONSTRAINT request_spec_rejeitar CHECK (false) NOT VALID')
      const result = await c.request('POST', '/api/pagamentos', c.ana.token, multipart(rateioId), randomUUID())
      assert.equal(result.status, 400)
      assert.equal(await c.db.pagamento.count(), 0); assert.equal(await c.db.comprovante.count(), 0)
      assert.equal((await c.request<Schemas['RateioPessoal']>('GET', `/api/me/financeiro/${rateioId}`, c.ana.token)).body.valorPago, '0.00')
    } finally { await c.close() }
  })
  it('quando revoga a sessão antes do upload, então responde 401 antes de validar o arquivo inválido', async () => {
    const c = await contextoCasa()
    try {
      assert.equal((await c.request('POST', '/api/auth/logout', c.ana.token)).status, 204)
      const result = await c.request('POST', '/api/pagamentos', c.ana.token, multipart(randomUUID(), Buffer.from('inválido')), randomUUID())
      assert.equal(result.status, 401); assert.equal(await c.db.pagamento.count(), 0)
    } finally { await c.close() }
  })
  it('quando dois uploads reais aguardam conteúdo, então o terceiro recebe 429 e as vagas são liberadas', async () => {
    const c = await contextoCasa()
    const held: ReturnType<typeof httpRequest>[] = []
    try {
      const bill = await c.expense(c.admin, [c.anaMember.id]), rateioId = bill.rateios[0]!.id
      for (let i = 0; i < 2; i++) {
        const req = httpRequest(`${c.base}/api/pagamentos`, { method: 'POST', headers: {
          Authorization: `Bearer ${c.ana.token}`, 'Idempotency-Key': randomUUID(), 'Content-Type': 'multipart/form-data; boundary=held', 'Content-Length': '100000',
        } })
        req.on('error', () => {}); req.on('response', res => res.resume())
        req.write('--held\r\nContent-Disposition: form-data; name="rateioId"\r\n\r\n')
        held.push(req)
      }
      // Sondagens inválidas não registram pagamentos enquanto os dois sockets alcançam o multer.
      let saturated = false
      for (let i = 0; i < 40; i++) {
        const probe = await c.request('POST', '/api/pagamentos', c.ana.token, multipart(rateioId, Buffer.from('inválido')), randomUUID())
        if (probe.status === 429) { assert.ok(probe.headers.get('retry-after')); saturated = true; break }
        assert.equal(probe.status, 400); await delay(25)
      }
      assert.equal(saturated, true, 'Os dois uploads reais devem ocupar as duas vagas')
      const third = await c.request('POST', '/api/pagamentos', c.ana.token, multipart(rateioId), randomUUID())
      assert.equal(third.status, 429); assert.equal(third.headers.get('retry-after'), '1')
      for (const req of held) req.destroy()
      // A confirmação de liberação usa rejeição de arquivo, sem alterar o saldo.
      let released = false
      for (let i = 0; i < 40; i++) {
        const probe = await c.request('POST', '/api/pagamentos', c.ana.token, multipart(rateioId, Buffer.from('inválido')), randomUUID())
        if (probe.status === 400) { released = true; break }
        assert.equal(probe.status, 429); await delay(25)
      }
      assert.equal(released, true); assert.equal(await c.db.pagamento.count(), 0)
    } finally { for (const req of held) req.destroy(); await c.close() }
  })
})
