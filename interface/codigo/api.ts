export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export async function request<T>(
  path: string,
  token?: string,
  body?: Record<string, unknown> | FormData,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const multipart = body instanceof FormData
  const response = await fetch('/api' + path, {
    method: body ? 'POST' : 'GET',
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
    throw Object.assign(new Error(data?.error?.message || 'Não foi possível conectar. Tente novamente.'), { status: response.status })
  }
  return data as T
}
