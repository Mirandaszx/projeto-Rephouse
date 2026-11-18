import { useEffect, useRef, useState } from 'react'
import { allowsSurfaceMotion } from './useDialogMotion'

export type Notice = { id: string; message: string; instant: boolean }

/** Reutiliza o aviso existente; IDs impedem uma saída antiga de apagar novo sucesso. */
export default function SuccessNotice({ notice, onDismiss }: { notice: Notice; onDismiss: (id: string) => void }) {
  const element = useRef<HTMLDivElement>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const closing = closingId === notice.id
  useEffect(() => {
    if (!closing) return
    const dismiss = () => onDismiss(notice.id)
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const changed = () => { if (preference.matches) dismiss() }
    const timer = setTimeout(dismiss, 200)
    document.addEventListener('keydown', dismiss, true)
    preference.addEventListener('change', changed)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', dismiss, true)
      preference.removeEventListener('change', changed)
    }
  }, [closing, notice.id, onDismiss])

  return <div ref={element} className="rh-toast" data-state={closing ? 'closed' : 'open'} data-instant={notice.instant && !closing ? '' : undefined}
    onTransitionEnd={event => {
      if (closing && event.target === event.currentTarget && event.propertyName === 'opacity') onDismiss(notice.id)
    }}>
    <span key={notice.id}>{notice.message}</span><button type="button" aria-label="Fechar aviso" onClick={event => {
      if (event.detail === 0 || !allowsSurfaceMotion(element.current)) onDismiss(notice.id)
      else setClosingId(notice.id)
    }}>×</button>
  </div>
}
