import { useCallback, useEffect, useRef } from 'react'

export function allowsSurfaceMotion(element: HTMLElement | null) {
  return element?.closest<HTMLElement>('.rep-internal')?.dataset.workspaceInput === 'pointer'
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Mantém o diálogo nativo modal até a saída terminar, inclusive seu backdrop. */
export function useDialogMotion() {
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const pending = useRef<{ promise: Promise<void>; cancel: () => void } | null>(null)

  useEffect(() => () => { pending.current?.cancel() }, [])

  const open = useCallback(() => {
    const element = dialog.current
    if (!element || element.open || pending.current) return
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.dataset.motionInstant = String(!allowsSurfaceMotion(element))
    element.showModal()
  }, [])

  const close = useCallback((onClosed?: () => void) => {
    if (pending.current) return pending.current.promise
    const element = dialog.current
    if (!element?.open) { onClosed?.(); return Promise.resolve() }
    const form = element.querySelector('form')
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let resolve!: () => void
    const promise = new Promise<void>(done => { resolve = done })
    let finished = false
    const finish = (notify = true) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      element.removeEventListener('transitionend', ended)
      document.removeEventListener('keydown', keyboard, true)
      preference.removeEventListener('change', changed)
      if (element.open) element.close()
      if (form) form.inert = false
      delete element.dataset.motionState
      pending.current = null
      if (notify && element.isConnected) {
        // O refresh pode substituir o acionador; nesse caso, devolve ao conteúdo.
        const target = opener.current?.isConnected ? opener.current : element.closest('.rep-internal')?.querySelector<HTMLElement>('main')
        target?.focus({ preventScroll: true })
        onClosed?.()
      }
      resolve()
    }
    const ended = (event: TransitionEvent) => {
      if (event.target === element && !event.pseudoElement && event.propertyName === 'opacity') finish()
    }
    const keyboard = () => finish()
    const changed = () => { if (preference.matches) finish() }
    // Segurança para remoção de CSS, abas em segundo plano ou evento não entregue.
    const timer = setTimeout(() => finish(), 200)
    pending.current = { promise, cancel: () => finish(false) }
    if (!allowsSurfaceMotion(element)) { finish(); return promise }
    // inerte somente durante a saída: nenhum clique/Enter pode reenviar o formulário.
    if (form) form.inert = true
    element.dataset.motionInstant = 'false'
    // Materializa o estado atual para retomar suavemente mesmo durante a entrada.
    void getComputedStyle(element).opacity
    element.dataset.motionState = 'closing'
    element.addEventListener('transitionend', ended)
    document.addEventListener('keydown', keyboard, true)
    preference.addEventListener('change', changed)
    return promise
  }, [])

  const isClosing = useCallback(() => pending.current !== null, [])
  return { dialog, open, close, isClosing }
}
