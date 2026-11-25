import { useState, type ReactNode } from 'react'
import ErrorNotice from '../interno/ErrorNotice'
import type { Feedback } from '../interno/feedback'
import { GlisseButton } from '../rebuild/GlisseButton'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '../rebuild/vendor/shadcn-alert-dialog'
import { errorFeedback } from './types'

type Props = { title: string; confirm: string; children: ReactNode; onClose: () => void; onConfirm: () => Promise<void> }

/**
 * Confirmação de ação que não se desfaz (shadcn AlertDialog sobre Base UI, 25/11/2026).
 * Leitores de tela anunciam como alerta, o clique fora não fecha e o foco começa em "Cancelar".
 */
export default function ConfirmDialog({ title, confirm, children, onClose, onConfirm }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Feedback>('')
  const close = () => { if (!busy) onClose() }
  return <AlertDialog open onOpenChange={open => { if (!open) close() }}>
    <AlertDialogContent container={document.querySelector<HTMLElement>('.rep-internal') ?? undefined}
      initialFocus={() => document.querySelector<HTMLElement>('.rep-alert-dialog footer button')}>
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription render={<div />}>{children}</AlertDialogDescription>
      {error && <ErrorNotice error={error} />}
      <AlertDialogFooter>
        <GlisseButton variant="secondary" disabled={busy} onClick={close}>Cancelar</GlisseButton>
        <GlisseButton tint="#9f3834" disabled={busy} onClick={() => {
          setBusy(true); setError('')
          void onConfirm().then(onClose).catch(failure => { setError(errorFeedback(failure)); setBusy(false) })
        }}>{busy ? 'Salvando…' : confirm}</GlisseButton>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
