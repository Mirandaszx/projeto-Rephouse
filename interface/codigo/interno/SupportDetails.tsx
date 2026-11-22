import { useState } from 'react'

export default function SupportDetails({ requestId, className = 'workspace-error-support', onOpenChange }: {
  requestId: string; className?: string; onOpenChange?: (open: boolean) => void
}) {
  const [copyStatus, setCopyStatus] = useState('')
  return <details className={className} onToggle={event => onOpenChange?.(event.currentTarget.open)}>
    <summary>Detalhes para suporte</summary>
    <p>Se precisar de ajuda, envie este código:</p>
    <code>{requestId}</code>
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(requestId); setCopyStatus('Código copiado.') }
      catch { setCopyStatus('Não foi possível copiar. Selecione o código acima para copiar manualmente.') }
    }}>Copiar código</button>
    {copyStatus && <p role="status">{copyStatus}</p>}
  </details>
}
