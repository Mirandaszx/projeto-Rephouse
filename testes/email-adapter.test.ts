import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createResendSender, type EmailMessage } from '../codigo/infraestrutura/email/resend.js'
import { createBrevoSender } from '../codigo/infraestrutura/email/brevo.js'
import { loadEnv } from '../codigo/configuracao/env.js'
import { operationalLog } from '../codigo/compartilhado/http/request-log.js'

const message: EmailMessage = { id: 'operacao-ficticia', to: 'destino@example.test', subject: 'Teste', text: 'Corpo fictício', html: '<p>Corpo fictício</p>' }
describe('Fronteira externa de e-mail e configuração', () => {
  it('quando o Resend aceita, então envia pelo backend com chave de envio, timeout e idempotência por mensagem', async () => {
    let calls = 0
    const send = createResendSender('re_ficticia', 'onboarding@resend.dev', async (url, options) => {
      calls++; assert.equal(url, 'https://api.resend.com/emails')
      assert.equal(options?.method, 'POST'); assert.ok(options.signal)
      assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer re_ficticia')
      assert.equal(new Headers(options.headers).get('Idempotency-Key'), message.id)
      assert.deepEqual(JSON.parse(String(options.body)), { from: 'onboarding@resend.dev', to: [message.to], subject: message.subject, text: message.text, html: message.html })
      return Response.json({ id: 'provider-message' })
    })
    await send(message); assert.equal(calls, 1)
  })
  it('quando há recusa, quota, resposta inválida ou queda, então retorna erro seguro sem repetir automaticamente', async () => {
    for (const mode of ['quota', 'forbidden', 'badjson', 'missing', 'network']) {
      let calls = 0
      const send = createResendSender('re_ficticia', 'onboarding@resend.dev', async () => {
        calls++
        if (mode === 'network') throw new Error('senha-do-provedor-ficticia')
        return mode === 'badjson' ? new Response('inválido') : mode === 'missing' ? Response.json({}) : new Response('senha-do-provedor-ficticia', { status: mode === 'quota' ? 429 : 403 })
      })
      await assert.rejects(send(message), (error: unknown) => {
        assert.ok(error && typeof error === 'object' && 'code' in error && 'message' in error)
        assert.equal(error.code, 'EMAIL_UNAVAILABLE'); assert.ok(!String(error.message).includes('senha-do-provedor'))
        return true
      })
      assert.equal(calls, 1)
    }
  })
  it('quando o Brevo aceita, então envia pelo backend com a chave no header api-key, remetente e corpo em texto e HTML', async () => {
    let calls = 0
    const send = createBrevoSender('xkeysib-ficticia', 'remetente@example.test', async (url, options) => {
      calls++; assert.equal(url, 'https://api.brevo.com/v3/smtp/email')
      assert.equal(options?.method, 'POST'); assert.ok(options.signal)
      assert.equal(new Headers(options.headers).get('api-key'), 'xkeysib-ficticia')
      assert.equal(new Headers(options.headers).get('Authorization'), null)
      assert.deepEqual(JSON.parse(String(options.body)), {
        sender: { email: 'remetente@example.test', name: 'RepHouse' }, to: [{ email: message.to }], subject: message.subject,
        htmlContent: message.html, textContent: message.text,
      })
      return Response.json({ messageId: '<provider-message@relay.example.test>' }, { status: 201 })
    })
    await send(message); assert.equal(calls, 1)
    await createBrevoSender('xkeysib-ficticia', 'remetente@example.test', async () => Response.json({ messageIds: ['<a@relay.example.test>'] }, { status: 201 }))(message)
  })
  it('quando o Brevo recusa (IP bloqueado, sem créditos, quota), responde inválido ou cai, então retorna erro seguro sem repetir', async () => {
    for (const mode of ['unauthorized', 'credits', 'quota', 'badjson', 'missing', 'empty-list', 'network']) {
      let calls = 0
      const send = createBrevoSender('xkeysib-ficticia', 'remetente@example.test', async () => {
        calls++
        if (mode === 'network') throw new Error('senha-do-provedor-ficticia')
        if (mode === 'badjson') return new Response('inválido', { status: 201 })
        if (mode === 'missing') return Response.json({}, { status: 201 })
        if (mode === 'empty-list') return Response.json({ messageIds: [] }, { status: 201 })
        return Response.json({ code: 'senha-do-provedor-ficticia' }, { status: mode === 'unauthorized' ? 401 : mode === 'credits' ? 402 : 429 })
      })
      await assert.rejects(send(message), (error: unknown) => {
        assert.ok(error && typeof error === 'object' && 'code' in error && 'message' in error)
        assert.equal(error.code, 'EMAIL_UNAVAILABLE'); assert.ok(!String(error.message).includes('senha-do-provedor'))
        return true
      })
      assert.equal(calls, 1)
    }
  })
  it('quando o Brevo recusa, então registra só o status e o código documentado, nunca o conteúdo do provedor', async () => {
    const registros: Record<string, unknown>[] = []
    const recusa = (body: unknown, status: number) => createBrevoSender('xkeysib-ficticia', 'remetente@example.test', async () => Response.json(body, { status }), evento => registros.push(evento))
    await assert.rejects(recusa({ code: 'unauthorized', message: 'chave senha-do-provedor-ficticia' }, 401)(message))
    await assert.rejects(recusa({ code: 'senha-do-provedor-ficticia' }, 400)(message))
    await assert.rejects(createBrevoSender('xkeysib-ficticia', 'remetente@example.test', async () => { throw new Error('senha-do-provedor-ficticia') }, evento => registros.push(evento))(message))
    assert.deepEqual(registros, [
      { event: 'email_provider_rejected', category: 'brevo', status: 401, code: 'unauthorized' },
      { event: 'email_provider_rejected', category: 'brevo', status: 400, code: 'outro' },
      { event: 'email_provider_unreachable', category: 'brevo' },
    ])
    assert.ok(!JSON.stringify(registros).includes('senha-do-provedor'))
    assert.ok(!JSON.stringify(registros).includes('example.test'))
  })
  it('quando a recusa passa pelo logger de produção, então conserva o código seguro e descarta conteúdo privado', async () => {
    const registros: Record<string, unknown>[] = []
    const send = createBrevoSender('xkeysib-ficticia', 'remetente@example.test', async () => Response.json({
      code: 'unauthorized', message: 'segredo-ficticio-do-provedor destino@example.test',
    }, { status: 401 }), evento => registros.push(operationalLog(evento)))
    await assert.rejects(send(message), { code: 'EMAIL_UNAVAILABLE' })
    assert.equal(registros.length, 1)
    assert.equal(registros[0]!.event, 'email_provider_rejected')
    assert.equal(registros[0]!.category, 'brevo')
    assert.equal(registros[0]!.status, 401)
    assert.equal(registros[0]!.code, 'unauthorized')
    assert.equal(registros[0]!['log.level'], 'warn')
    assert.ok(!JSON.stringify(registros).includes('segredo-ficticio'))
    assert.ok(!JSON.stringify(registros).includes('example.test'))
  })
  it('quando escolhe o Brevo, então exige remetente e origem junto com a chave e recusa dois provedores ao mesmo tempo', () => {
    const base = { JWT_SECRET: 'segredo-ficticio-com-mais-de-32-caracteres', DATABASE_URL: 'postgresql://teste:teste@localhost/rabbu_mvp_test', CORS_ORIGINS: 'https://app.example.test' }
    const completo = { ...base, EMAIL_FROM: 'remetente@example.test', APP_PUBLIC_URL: 'https://app.example.test', NODE_ENV: 'production' }
    assert.throws(() => loadEnv({ ...base, BREVO_API_KEY: 'xkeysib-ficticia' }))
    assert.throws(() => loadEnv({ ...completo, BREVO_API_KEY: 're_formato_errado' }))
    assert.throws(() => loadEnv({ ...completo, BREVO_API_KEY: 'xkeysib-ficticia', RESEND_API_KEY: 're_ficticia' }))
    assert.equal(loadEnv({ ...completo, BREVO_API_KEY: 'xkeysib-ficticia' }).BREVO_API_KEY, 'xkeysib-ficticia')
    assert.equal(loadEnv(base).BREVO_API_KEY, undefined)
  })
  it('quando configura parcialmente ou usa HTTP em produção, então recusa iniciar; configuração ausente preserva senha', () => {
    const base = { JWT_SECRET: 'segredo-ficticio-com-mais-de-32-caracteres', DATABASE_URL: 'postgresql://teste:teste@localhost/rabbu_mvp_test', CORS_ORIGINS: 'http://localhost:5173' }
    assert.equal(loadEnv(base).RESEND_API_KEY, undefined)
    assert.throws(() => loadEnv({ ...base, RESEND_API_KEY: 're_ficticia' }))
    assert.throws(() => loadEnv({ ...base, RESEND_API_KEY: 're_ficticia', EMAIL_FROM: 'teste@example.test', APP_PUBLIC_URL: 'http://localhost:5173', NODE_ENV: 'production' }))
    const env = loadEnv({ ...base, RESEND_API_KEY: 're_ficticia', EMAIL_FROM: 'teste@example.test', APP_PUBLIC_URL: 'https://app.example.test', CORS_ORIGINS: 'https://app.example.test', NODE_ENV: 'production' })
    assert.equal(env.APP_PUBLIC_URL, 'https://app.example.test')
  })
})
