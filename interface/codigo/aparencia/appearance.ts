import { useSyncExternalStore } from 'react'

type Appearance = 'system' | 'light' | 'dark'
const key = 'rephouse-appearance'
const system = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()
const valid = (value: string | null): Appearance => value === 'light' || value === 'dark' ? value : 'system'
function read(): Appearance {
  try { return valid(localStorage.getItem(key)) } catch { return 'system' }
}
let preference = read()
function apply() {
  document.documentElement.dataset.theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference
  listeners.forEach(listener => listener())
}
apply()
system.addEventListener('change', () => { if (preference === 'system') apply() })
window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) { preference = read(); apply() }
})
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function change(value: Appearance) {
  preference = value
  // A preferência funciona nesta aba mesmo quando o navegador bloqueia armazenamento.
  try { localStorage.setItem(key, value) } catch { /* Mantém a escolha em memória. */ }
  apply()
}
export function useAppearance() {
  const value = useSyncExternalStore(subscribe, () => preference)
  return { preference: value, change }
}
