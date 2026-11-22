type Entry = { references: number; url?: string; controller: AbortController; promise: Promise<string> }
const entries = new Map<string, Entry>()
export type PhotoMetadata = { versao: string; atualizadaEm: string }
export function acquirePhoto(key: string, userId: string, token: string) {
  let entry = entries.get(key)
  if (!entry) {
    const controller = new AbortController()
    const created: Entry = { references: 0, controller, promise: Promise.resolve('') }
    created.promise = fetch(`/api/usuarios/${encodeURIComponent(userId)}/foto`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal,
    }).then(async response => {
      if (!response.ok || !response.headers.get('Content-Type')?.startsWith('image/webp')) throw Error('Foto indisponível')
      const blob = await response.blob()
      if (controller.signal.aborted || created.references === 0) throw Error('Contexto encerrado')
      return created.url = URL.createObjectURL(blob)
    })
    entries.set(key, created); entry = created
  }
  entry.references++
  const current = entry
  return { promise: current.promise, release() {
    current.references--
    if (current.references === 0) {
      current.controller.abort()
      if (current.url) URL.revokeObjectURL(current.url)
      if (entries.get(key) === current) entries.delete(key)
    }
  } }
}
export function clearProfilePhotos() {
  for (const entry of entries.values()) { entry.controller.abort(); if (entry.url) URL.revokeObjectURL(entry.url) }
  entries.clear()
}
window.addEventListener('pagehide', clearProfilePhotos)
