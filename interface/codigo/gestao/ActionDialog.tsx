import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { GlisseButton } from '../rebuild/GlisseButton'
import { errorMessage } from './types'
import { useDialogMotion } from '../interno/useDialogMotion'
import './management.css'

type Props = { title: string; confirm: string; children: ReactNode; onClose: () => void; onSubmit: (data: FormData) => Promise<void>; danger?: boolean }

export default function ActionDialog({ title, confirm, children, onClose, onSubmit, danger = false }: Props) {
  const { dialog, open, close, isClosing } = useDialogMotion()
  const cancel = useRef<HTMLButtonElement>(null)
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const id = useId()
  useEffect(() => {
    const element = dialog.current!
    open()
    cancel.current?.focus()
    return () => element.close()
  }, [dialog, open])
  return <dialog ref={dialog} className="rep-dialog rep-management-dialog" data-danger={danger} aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!lock.current) void close(onClose) }}>
    <form aria-busy={busy} onSubmit={event => {
      event.preventDefault()
      if (lock.current || isClosing()) return
      const data = new FormData(event.currentTarget)
      lock.current = true
      setBusy(true)
      setError('')
      void onSubmit(data).then(() => close(onClose)).catch(failure => setError(errorMessage(failure))).finally(() => { lock.current = false; setBusy(false) })
    }}>
      <h2 id={id}>{title}</h2>
      <fieldset disabled={busy}>{children}</fieldset>
      {error && <p className="rep-action-error" role="alert">{error}</p>}
      <footer><button ref={cancel} type="button" className="rep-logout" disabled={busy} onClick={() => void close(onClose)}>Cancelar</button><GlisseButton type="submit" tint={danger ? '#9f3834' : undefined} disabled={busy}>{busy ? 'Salvando…' : confirm}</GlisseButton></footer>
    </form>
  </dialog>
}
