import type { components } from './api.js'
import { conferir } from './exemplos.js'

export async function salvarFoto(baseUrl: string, token: string, imagem: Blob, recorte: { x: number; y: number; largura: number; altura: number }): Promise<components['schemas']['FotoPerfil']> {
  const body = new FormData()
  body.set('imagem', imagem, 'foto'); body.set('recorte', JSON.stringify(recorte))
  const response = await fetch(`${baseUrl}/api/me/foto`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body })
  await conferir(response)
  return await response.json() as components['schemas']['FotoPerfil']
}
export async function removerFoto(baseUrl: string, token: string): Promise<void> {
  await conferir(await fetch(`${baseUrl}/api/me/foto`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }))
}
/** Retorna bytes. A tela cria uma URL de objeto temporária e a revoga ao sair. */
export async function consultarFoto(baseUrl: string, token: string, usuarioId: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(`${baseUrl}/api/usuarios/${encodeURIComponent(usuarioId)}/foto`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal })
  await conferir(response)
  return response.blob()
}
