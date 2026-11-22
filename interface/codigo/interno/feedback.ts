import { ApiError } from '../api'

export type Feedback = string | { message: string; requestId?: string }

/** O identificador acompanha o erro, sem fazer parte da mensagem de orientação. */
export function errorFeedback(error: unknown): Feedback {
  if (error instanceof ApiError) return { message: error.userMessage, requestId: error.requestId }
  return { message: error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.' }
}

export const uncertainCreationMessage = 'Não foi possível confirmar se foi salvo. Reenvie a mesma solicitação antes de alterar os dados.'
