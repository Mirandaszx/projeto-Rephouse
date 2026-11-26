import 'dotenv/config'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { abrirRequestSpec, password } from './auxiliares/request-spec.js'
import { limparDadosVencidos } from '../codigo/modulos/privacidade/limpeza.js'

// LGPD (26/11/2026): exclusão que anonimiza, cópia dos próprios dados, limpeza de registros vencidos e contato.
describe('Privacidade e LGPD por HTTP e PostgreSQL reais', () => {
  it('quando a pessoa exclui a conta, então os dados pessoais somem e o histórico fica sem identificá-la', async () => {
    const c = await abrirRequestSpec()
    try {
      const admin = await c.register(), casa = await c.house(admin), pessoa = await c.register()
      await c.join(pessoa, casa.codigoEntrada)
      const antes = await c.db.usuario.findUniqueOrThrow({ where: { id: pessoa.usuario.id } })
      const vinculos = (await c.db.membroRepublica.findMany({ where: { usuarioId: pessoa.usuario.id } })).map(m => m.id)
      const vinculosAdmin = (await c.db.membroRepublica.findMany({ where: { usuarioId: admin.usuario.id } })).map(m => m.id)
      await c.db.fotoPerfil.create({ data: { usuarioId: pessoa.usuario.id, conteudo: Buffer.from([1, 2, 3]), mimeType: 'image/webp', tamanho: 3, hashSha256: 'a'.repeat(64) } })
      assert.equal((await c.request('POST', '/api/auth/email/solicitar', undefined, { email: antes.email })).status, 202)
      assert.ok(await c.db.linkEmail.count({ where: { email: antes.email } }))
      assert.ok(await c.db.notificacao.count({ where: { membroId: { in: vinculosAdmin } } }))

      assert.equal((await c.request('DELETE', '/api/me', pessoa.token, { senha: password })).status, 204)

      const depois = await c.db.usuario.findUniqueOrThrow({ where: { id: pessoa.usuario.id } })
      assert.equal(depois.nome, 'Ex-morador'); assert.equal(depois.senhaHash, null); assert.equal(depois.ativo, false); assert.ok(depois.excluidoEm)
      assert.match(depois.email, /^excluido-[a-f0-9]{32}@rephouse\.invalid$/)
      assert.equal(await c.db.fotoPerfil.count({ where: { usuarioId: pessoa.usuario.id } }), 0)
      assert.equal(await c.db.linkEmail.count({ where: { email: antes.email } }), 0)
      assert.equal(await c.db.emailVerificado.count({ where: { usuarioId: pessoa.usuario.id } }), 0)
      assert.equal(await c.db.notificacao.count({ where: { membroId: { in: vinculos } } }), 0)
      // O vínculo continua (histórico da casa) e os avisos sobre a pessoa não trazem mais o nome dela.
      assert.equal(await c.db.membroRepublica.count({ where: { id: { in: vinculos } } }), vinculos.length)
      const eventos = await c.db.eventoNotificacao.findMany({ where: { membroEventoId: { in: vinculos } } })
      assert.ok(eventos.length >= 2); assert.ok(eventos.every(e => e.titulo === 'Ex-morador'))
      // Avisos de outra pessoa com o mesmo nome continuam intactos.
      assert.ok((await c.db.eventoNotificacao.findMany({ where: { membroEventoId: { in: vinculosAdmin } } })).every(e => e.titulo === antes.nome))
      assert.equal((await c.request('POST', '/api/auth/login', undefined, { email: antes.email, senha: password })).status, 401)
      // O e-mail fica livre: a mesma pessoa pode voltar com uma conta nova, sem nada da antiga.
      await c.db.$executeRaw`UPDATE limites_envio_email SET ultimo_envio = CURRENT_TIMESTAMP - interval '61 seconds'`
      assert.equal((await c.request('POST', '/api/auth/register', undefined, { nome: 'Pessoa de volta', email: antes.email, senha: password })).status, 202)
      const nova = await c.request<{ usuario: { id: string } }>('POST', '/api/auth/email/confirmar', undefined, c.mailbox.proof(antes.email))
      assert.equal(nova.status, 200); assert.notEqual(nova.body.usuario.id, pessoa.usuario.id)
    } finally { await c.close() }
  })

  it('quando alguém tenta anonimizar uma conta ativa direto no banco, então a função recusa sem alterar nada', async () => {
    const c = await abrirRequestSpec()
    try {
      const pessoa = await c.register(), antes = await c.db.usuario.findUniqueOrThrow({ where: { id: pessoa.usuario.id } })
      await assert.rejects(c.db.$executeRaw`SELECT rephouse_anonimizar_conta_excluida(${pessoa.usuario.id}::uuid)`, /excluídas|RH002/)
      assert.deepEqual(await c.db.usuario.findUniqueOrThrow({ where: { id: pessoa.usuario.id } }), antes)
    } finally { await c.close() }
  })

  it('quando baixa os próprios dados, então recebe só o que é seu, sem segredos, como arquivo', async () => {
    const c = await abrirRequestSpec()
    try {
      const admin = await c.register(), casa = await c.house(admin), pessoa = await c.register()
      await c.join(pessoa, casa.codigoEntrada)
      await c.expense(admin, (await c.members(admin)).map(m => m.id))
      assert.equal((await c.request('GET', '/api/me/dados')).status, 401)
      const response = await fetch(`${c.base}/api/front/v1/me/dados`, { headers: { Authorization: `Bearer ${pessoa.token}`, Origin: 'http://localhost:5173' } })
      assert.equal(response.status, 200)
      assert.match(response.headers.get('content-disposition') ?? '', /^attachment; filename="rephouse-meus-dados\.json"$/)
      const texto = await response.text(), dados = JSON.parse(texto)
      assert.equal(dados.conta.email, pessoa.usuario.email); assert.equal(dados.republicas.length, 1)
      assert.equal(dados.suasPartesNasDespesas.length, 1); assert.ok(Array.isArray(dados.notificacoes))
      assert.doesNotMatch(texto, /argon2|senhaHash|tokenHash|cookieHash|nonce|conteudo|hashSha256|chaveIdempotencia/i)
      assert.ok(!texto.includes(admin.usuario.email), 'Os dados de outros moradores não entram')
    } finally { await c.close() }
  })

  it('quando a limpeza roda, então apaga só links e limites vencidos há mais de um dia', async () => {
    const c = await abrirRequestSpec()
    try {
      const pessoa = await c.register(), email = pessoa.usuario.email
      await c.db.$executeRaw`UPDATE limites_envio_email SET janela_inicio = CURRENT_TIMESTAMP - interval '2 days', ultimo_envio = CURRENT_TIMESTAMP - interval '2 days'`
      await c.db.$executeRaw`UPDATE links_email SET criado_em = CURRENT_TIMESTAMP - interval '2 days', expira_em = CURRENT_TIMESTAMP - interval '2 days' + interval '10 minutes', consumido_em = NULL WHERE email = ${email}`
      const vencidos = await c.db.linkEmail.count({ where: { email } })
      assert.ok(vencidos >= 1)
      assert.equal((await c.request('POST', '/api/auth/email/solicitar', undefined, { email })).status, 202)
      const recente = c.mailbox.proof(email)
      assert.ok(await limparDadosVencidos(c.db) >= vencidos)
      assert.deepEqual((await c.db.linkEmail.findMany({ where: { email } })).map(l => l.id), [recente.id])
      assert.equal(await c.db.limiteEnvioEmail.count({ where: { ultimoEnvio: { lt: new Date(Date.now() - 86_400_000) } } }), 0)
      assert.equal((await c.request('POST', '/api/auth/email/confirmar', undefined, recente)).status, 200)
    } finally { await c.close() }
  })

  it('quando consulta o contato de privacidade, então recebe o contato configurado sem precisar de login', async () => {
    const c = await abrirRequestSpec(undefined, { privacyContact: 'privacidade@rephouse.test' })
    try {
      for (const path of ['/api/privacidade', '/api/front/v1/privacidade']) {
        const r = await c.request<{ contato: string; versaoPolitica: string }>('GET', path)
        assert.equal(r.status, 200); assert.deepEqual(r.body, { contato: 'privacidade@rephouse.test', versaoPolitica: '2026-11-26' })
      }
    } finally { await c.close() }
  })
})
