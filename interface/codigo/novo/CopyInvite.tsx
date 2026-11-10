import { useState } from 'react'
import { CopyButton } from '../rebuild/vendor/spell-copy-button'

export default function CopyInvite({ code }: { code: string }) {
  const [message, setMessage] = useState('')
  return <div className="rep-copy">
    <span className="rep-copy-label">Código de entrada</span>
    <code>{code}</code>
    <CopyButton value={code} size="lg" className="rep-secondary" onCopyResult={copied => {
      setMessage(copied ? 'Código copiado.' : 'Selecione e copie o código acima.')
    }} />
    <span role="status">{message}</span>
  </div>
}
