export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export async function request<T>(
  path: string,
  token?: string,
  body?: Record<string, unknown> | FormData,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  return apiRequest<T>(body ? 'POST' : 'GET', path, token, body, extraHeaders)
}

export class ApiError extends Error {
  status: number
  code?: string
  requestId?: string
  userMessage: string
  constructor(response: Response, data: { error?: { code?: string; message?: string } } | null) {
    const id = response.headers.get('X-Request-Id')
    const retry = response.headers.get('Retry-After')
    const message = (data?.error?.message || 'Não foi possível conectar. Tente novamente.')
      + (response.status === 429 && retry ? ` Tente novamente após ${retry} segundos.` : '')
    super(message + (id ? ` Identificação para suporte: ${id}.` : ''))
    this.status = response.status
    this.code = data?.error?.code
    this.requestId = id ?? undefined
    this.userMessage = message
  }
}

export function endSession() {
  sessionStorage.removeItem('rephouse-token')
  window.location.replace('/login')
}

export async function apiRequest<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, token?: string, body?: Record<string, unknown> | FormData, extraHeaders?: Record<string, string>): Promise<T> {
  const multipart = body instanceof FormData
  const response = await fetch('/api' + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}),
      ...extraHeaders,
    },
    body: multipart ? body : body ? JSON.stringify(body) : undefined,
  })
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok || data === null) {
    const failure = new ApiError(response, data)
    // Senha de confirmação incorreta não é sessão expirada.
    if (token && failure.status === 401 && failure.code === 'UNAUTHENTICATED') endSession()
    throw failure
  }
  return data as T
}

export async function downloadReceipt(paymentId: string, token: string) {
  const response = await fetch(`/api/pagamentos/${encodeURIComponent(paymentId)}/comprovante`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) {
    const failure = new ApiError(response, await response.json().catch(() => null))
    if (failure.status === 401 && failure.code === 'UNAUTHENTICATED') endSession()
    throw failure
  }
  const file = await response.blob()
  const extensions: Record<string, string> = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
  const extension = extensions[file.type]
  if (!extension) throw new Error('Formato de comprovante indisponível.')
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `comprovante.${extension}`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Dá tempo para o navegador iniciar o download antes de liberar os bytes.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
