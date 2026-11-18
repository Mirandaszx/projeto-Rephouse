import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export type AuthFailure = { id: string; message: string; requestId?: string }

export default function AuthFeedback({ failure, onDismiss }: { failure: AuthFailure; onDismiss: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
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
    {failure.requestId && <details className="auth-error-support" onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary>Detalhes para suporte</summary>
      <p>Se precisar de ajuda, envie este código:</p>
      <code>{failure.requestId}</code>
      <button type="button" onClick={async () => {
        try {
          await navigator.clipboard.writeText(failure.requestId!)
          setCopyStatus('Código copiado.')
        } catch { setCopyStatus('Não foi possível copiar. Selecione o código acima para copiar manualmente.') }
      }}>Copiar código</button>
      {copyStatus && <p role="status">{copyStatus}</p>}
    </details>}
  </div>
}
