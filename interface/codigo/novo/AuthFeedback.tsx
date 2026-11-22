import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import SupportDetails from '../interno/SupportDetails'

export type AuthFailure = { id: string; message: string; requestId?: string }

export default function AuthFeedback({ failure, onDismiss }: { failure: AuthFailure; onDismiss: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const paused = hovered || focused || expanded

  useEffect(() => {
    if (paused) return
    // Uma nova tentativa remonta este aviso: o timer anterior nunca apaga o erro novo.
    const timer = window.setTimeout(onDismiss, 8000)
    return () => window.clearTimeout(timer)
  }, [paused, onDismiss])

  return <div className="auth-feedback" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
    }}>
    <div className="auth-error">
      <p role="alert">{failure.message}</p>
      <button type="button" className="auth-error-close" aria-label="Fechar mensagem" onClick={onDismiss}><X size={18} aria-hidden="true" /></button>
    </div>
    {failure.requestId && <SupportDetails requestId={failure.requestId} className="auth-error-support" onOpenChange={setExpanded} />}
  </div>
}
