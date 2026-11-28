import { AppError } from '../../compartilhado/http/app-error.js'

type ConfirmacaoEmail =
  | { finalidade: 'cadastro' | 'login'; params: { codigoConfirmacao: string; titulo: string; instrucao: string } }
  | { finalidade: 'cadastro'; params: { linkConfirmacao: string; instrucao: string } }
  | { finalidade: 'login'; params: { linkConfirmacao: string; titulo: string; instrucao: string; acao: string } }

export interface EmailMessage {
  id: string
  to: string
  subject: string
  text: string
  html: string
  confirmacao?: ConfirmacaoEmail
}
export type EmailSender = (message: EmailMessage) => Promise<void>
export interface EmailOptions { send: EmailSender; publicUrl: string; secureCookies?: boolean }

/** Somente a fronteira HTTP externa é substituída nos testes. Nenhum segredo vai ao navegador. */
export function createResendSender(apiKey: string, from: string, transport: typeof fetch = fetch): EmailSender {
  return async message => {
    try {
      const response = await transport('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': message.id },
        body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
      })
      // Não reproduzir corpo, headers ou erros do provedor: podem conter dados pessoais.
      if (!response.ok) throw new Error('provider')
      const result: unknown = await response.json()
      if (!result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string') throw new Error('provider')
    } catch {
      throw new AppError(503, 'EMAIL_UNAVAILABLE', 'Não foi possível confirmar o envio. Aguarde um minuto e tente novamente.')
    }
  }
}
