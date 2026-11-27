import { AppError } from '../../compartilhado/http/app-error.js'
import { stdoutLog, type LogSink } from '../../compartilhado/http/request-log.js'
import type { EmailSender } from './resend.js'

// Códigos de erro documentados pelo Brevo. Só eles vão para o registro; qualquer outro valor vira "outro",
// para que nada vindo do provedor (que pode conter dados pessoais) seja reproduzido.
const BREVO_CODES = new Set(['unauthorized', 'invalid_parameter', 'missing_parameter', 'permission_denied', 'not_enough_credits',
  'account_under_validation', 'not_acceptable', 'duplicate_parameter', 'document_not_found', 'method_not_allowed', 'out_of_range',
  'duplicate_request', 'reseller_permission_denied'])

async function providerCode(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    const code = body && typeof body === 'object' && 'code' in body ? body.code : undefined
    return typeof code === 'string' && BREVO_CODES.has(code) ? code : 'outro'
  } catch { return 'outro' }
}

/**
 * Envio pela API transacional do Brevo (plano gratuito: 300 e-mails/dia), escolhido em 25/11/2026 para o deploy
 * sem domínio próprio. O remetente precisa estar verificado no Brevo; com endereço gratuito (Gmail), o Brevo
 * troca o remetente visível e a mensagem pode cair no spam. Mesma fronteira do Resend: só o fetch muda nos testes.
 * Em falha, o registro guarda só o status HTTP e o código documentado do Brevo, para diagnosticar a configuração.
 */
export function createBrevoSender(apiKey: string, from: string, transport: typeof fetch = fetch, log: LogSink = stdoutLog): EmailSender {
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
      if (!response.ok) {
        log({ event: 'email_provider_rejected', category: 'brevo', status: response.status, code: await providerCode(response) })
        throw new Error('provider')
      }
      const result: unknown = await response.json()
      const aceito = !!result && typeof result === 'object' && (
        ('messageId' in result && typeof result.messageId === 'string')
        || ('messageIds' in result && Array.isArray(result.messageIds) && result.messageIds.length > 0))
      if (!aceito) {
        log({ event: 'email_provider_rejected', category: 'brevo', status: response.status, code: 'resposta_sem_id' })
        throw new Error('provider')
      }
    } catch (error) {
      if (!(error instanceof Error && error.message === 'provider')) log({ event: 'email_provider_unreachable', category: 'brevo' })
      throw new AppError(503, 'EMAIL_UNAVAILABLE', 'Não foi possível confirmar o envio. Aguarde um minuto e solicite outro link.')
    }
  }
}
