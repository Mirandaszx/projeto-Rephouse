import assert from 'node:assert/strict'
import type { EmailMessage, EmailOptions } from '../../codigo/infraestrutura/email/resend.js'

/** Caixa controlada substitui exclusivamente o provedor externo. Não há rota de teste no produto. */
export function testMailbox(publicUrl = 'http://localhost:5173') {
  const messages: EmailMessage[] = []
  const options: EmailOptions = { publicUrl, send: async message => { messages.push(message) } }
  function proof(email: string) {
    const last = messages.findLast(message => message.to === email)
    assert.ok(last, 'A API deve ter solicitado o envio pelo provedor externo')
    const value = last.text.match(/https?:\/\/[^\s]+/)?.[0]
    assert.ok(value)
    const link = new URL(value), params = new URLSearchParams(link.hash.slice(1))
    return { id: params.get('id')!, token: params.get('token')! }
  }
  return { messages, options, proof }
}
