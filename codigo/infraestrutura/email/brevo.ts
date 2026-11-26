import { AppError } from '../../compartilhado/http/app-error.js'
import type { EmailSender } from './resend.js'

/**
 * Envio pela API transacional do Brevo (plano gratuito: 300 e-mails/dia), escolhido em 25/11/2026 para o deploy
 * sem domínio próprio. O remetente precisa estar verificado no Brevo; com endereço gratuito (Gmail), o Brevo
 * troca o remetente visível e a mensagem pode cair no spam. Mesma fronteira do Resend: só o fetch muda nos testes.
 */
export function createBrevoSender(apiKey: string, from: string, transport: typeof fetch = fetch): EmailSender {
  return async message => {
    try {
      const response = await transport('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', signal: AbortSignal.timeout(8000),
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: from, name: 'RepHouse' }, to: [{ email: message.to }], subject: message.subject,
          htmlContent: message.html, textContent: message.text,
        }),
      })
      // Não reproduzir corpo, headers ou erros do provedor: podem conter dados pessoais.
      if (!response.ok) throw new Error('provider')
      const result: unknown = await response.json()
      const aceito = !!result && typeof result === 'object' && (
        ('messageId' in result && typeof result.messageId === 'string')
        || ('messageIds' in result && Array.isArray(result.messageIds) && result.messageIds.length > 0))
      if (!aceito) throw new Error('provider')
    } catch {
      throw new AppError(503, 'EMAIL_UNAVAILABLE', 'Não foi possível confirmar o envio. Aguarde um minuto e solicite outro link.')
    }
  }
}
