import ErrorNotice from '../interno/ErrorNotice'
import type { Feedback } from '../interno/feedback'
import { useRef, useState } from 'react'
import { brl, downloadReceipt } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import type { Schemas } from './types'
import { errorFeedback } from './types'

const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
export default function Payments({ payments, token, canDownload = true }: { payments: Schemas['Pagamento'][]; token: string; canDownload?: boolean }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState<Feedback>('')
  const lock = useRef(false)
  return <div>
    {!payments.length ? <p className="rep-management-note">Nenhum pagamento registrado.</p> : <ul className="rep-management-list" aria-label="Pagamentos registrados">{payments.map(payment => <li key={payment.id}><div className="rep-management-row"><div><strong>{brl.format(Number(payment.valor))}</strong><small>{date.format(new Date(payment.dataPagamento))} · Brasília</small></div>
      {payment.comprovanteUrl && canDownload ? <GlisseButton variant="secondary" disabled={Boolean(busy)} aria-label={`Baixar comprovante de ${brl.format(Number(payment.valor))}`} onClick={() => {
        if (lock.current) return
        lock.current = true; setBusy(payment.id); setError('')
        void downloadReceipt(payment.id, token).catch(failure => setError(errorFeedback(failure))).finally(() => { lock.current = false; setBusy('') })
      }}>{busy === payment.id ? 'Baixando…' : 'Baixar comprovante'}</GlisseButton> : <small>{payment.comprovanteUrl ? 'Comprovante protegido' : 'Sem comprovante'}</small>}
    </div></li>)}</ul>}
    {error && <ErrorNotice error={error} />}
  </div>
}
