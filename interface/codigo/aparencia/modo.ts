import { useSyncExternalStore } from 'react'

/**
 * Modo simples (só o essencial, letras e botões maiores) ou completo (todas as informações).
 * Sugestão do professor (24/11/2026): nem todo morador precisa ver o controle de gastos inteiro.
 * Preferência por aparelho, como o tema; sincroniza entre abas.
 */
export type Modo = 'simples' | 'completo'
const key = 'rephouse-modo'
const listeners = new Set<() => void>()
const read = (): Modo => { try { return localStorage.getItem(key) === 'simples' ? 'simples' : 'completo' } catch { return 'completo' } }
let modo = read()
window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) { modo = read(); listeners.forEach(listener => listener()) }
})
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
function change(value: Modo) {
  modo = value
  try { localStorage.setItem(key, value) } catch { /* Mantém a escolha nesta aba. */ }
  listeners.forEach(listener => listener())
}
export function useModo() {
  return { modo: useSyncExternalStore(subscribe, () => modo), change }
}
