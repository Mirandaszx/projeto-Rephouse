import { useEffect, useLayoutEffect, useRef } from 'react'

/** Suaviza trocas por ponteiro sem atrasar a consulta, remontar formulários ou mover dados. */
export function useWorkspaceTransition(identity: string) {
  const target = useRef<HTMLDivElement>(null)
  const previous = useRef(identity)
  const keyboard = useRef(true)
  const running = useRef<Animation | null>(null)

  useEffect(() => {
    const markInput = (value: 'pointer' | 'keyboard') => {
      document.querySelector<HTMLElement>('.rep-internal')?.setAttribute('data-workspace-input', value)
    }
    markInput('keyboard')
    const pointer = () => { keyboard.current = false; markInput('pointer') }
    const key = () => { keyboard.current = true; markInput('keyboard'); running.current?.cancel() }
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const cancel = () => { running.current?.cancel() }
    document.addEventListener('pointerdown', pointer, true)
    document.addEventListener('keydown', key, true)
    preference.addEventListener('change', cancel)
    return () => {
      cancel()
      document.removeEventListener('pointerdown', pointer, true)
      document.removeEventListener('keydown', key, true)
      preference.removeEventListener('change', cancel)
    }
  }, [])

  useLayoutEffect(() => {
    const changed = previous.current !== identity
    previous.current = identity
    running.current?.cancel()
    if (!changed || keyboard.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Sem fill: o conteúdo permanece visível mesmo após cancelamento ou nova troca rápida.
    running.current = target.current?.animate([{ opacity: .65 }, { opacity: 1 }], {
      duration: 160, easing: 'cubic-bezier(.23,1,.32,1)',
    }) ?? null
    return () => { running.current?.cancel() }
  }, [identity])

  return target
}
