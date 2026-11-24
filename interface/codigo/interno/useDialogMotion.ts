import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

export function allowsSurfaceMotion(element: HTMLElement | null) {
  return element?.closest<HTMLElement>('.rep-internal')?.dataset.workspaceInput === 'pointer'
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Mantém o diálogo nativo modal até a saída terminar, inclusive seu backdrop. */
export function useDialogMotion() {
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const pending = useRef<{ promise: Promise<void>; cancel: () => void } | null>(null)

  // Um formulário remontado após showModal pode remover o campo que recebeu foco.
  // Recupera somente nessa situação; não interfere na digitação nem na saída.
  useLayoutEffect(() => {
    const element = dialog.current
    if (!element?.open || pending.current || element.contains(document.activeElement)) return
    const controls = element.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea, button, a[href], [tabindex]')
    const target = Array.from(controls).find(node => !node.matches(':disabled, [tabindex="-1"]') && !node.closest('[inert]') && node.getClientRects().length > 0)
    target?.focus({ preventScroll: true })
  })

  useEffect(() => () => { pending.current?.cancel() }, [])

  const open = useCallback(() => {
    const element = dialog.current
    if (!element || element.open || pending.current) return
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.dataset.motionInstant = String(!allowsSurfaceMotion(element))
    element.showModal()
    // Na tentativa incerta, os campos continuam bloqueados. Reabrir começa pela
    // ação segura, mesmo que os detalhes de suporte tenham ficado expandidos.
    if (element.querySelector('fieldset[inert]')) element.querySelector<HTMLButtonElement>('footer button:not(:disabled)')?.focus({ preventScroll: true })
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
    // Espera a transição de saída em si, e não o evento transitionend: o da entrada pode
    // chegar no quadro seguinte e fecharia o diálogo sem animar quem cancela logo após abrir.
    void getComputedStyle(element).opacity
    const exit = element.getAnimations().find(animation => {
      const effect = animation.effect as KeyframeEffect | null
      return effect?.target === element && !effect.pseudoElement
        && 'transitionProperty' in animation && animation.transitionProperty === 'opacity'
    })
    // Cancelada (ex.: estilo removido), a saída fica com o limite de segurança acima.
    exit?.finished.then(() => finish(), () => {})
    document.addEventListener('keydown', keyboard, true)
    preference.addEventListener('change', changed)
    return promise
  }, [])

  const isClosing = useCallback(() => pending.current !== null, [])
  return { dialog, open, close, isClosing }
}
