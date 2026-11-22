import { useRef, useState } from 'react'
import { ApiError, request } from '../api'

type Attempt = { key: string; path: string; body: Record<string, unknown>; uncertain: boolean }

/** Apenas memória da tela: uma resposta perdida nunca gera outra identidade. */
export function useCreationAttempt() {
  const attempt = useRef<Attempt | null>(null)
  const [uncertain, setUncertain] = useState(false)
  async function send<T>(token: string, path?: string, body?: Record<string, unknown>): Promise<T> {
    if (!attempt.current) {
      if (!path || !body) throw new Error('Preencha os dados da criação.')
      attempt.current = { key: crypto.randomUUID(), path, body: structuredClone(body), uncertain: false }
    }
    const current = attempt.current
    try {
      const result = await request<T>(current.path, token, current.body, { 'Idempotency-Key': current.key }, AbortSignal.timeout(30000))
      attempt.current = null
      setUncertain(false)
      return result
    } catch (error) {
      // Uma rejeição do reenvio não prova que o primeiro envio incerto foi revertido.
      const definitive = !current.uncertain && error instanceof ApiError && error.status >= 400 && error.status < 500
        && error.code !== 'IDEMPOTENCY_CONFLICT'
      if (definitive) { attempt.current = null; setUncertain(false) }
      else { current.uncertain = true; setUncertain(true) }
      throw error
    }
  }
  return { send, uncertain, hasPending: () => attempt.current !== null }
}
