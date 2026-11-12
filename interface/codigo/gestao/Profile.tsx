import { useRef, useState } from 'react'
import { apiRequest, endSession } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import ActionDialog from './ActionDialog'
import type { Account } from './types'
import { errorMessage } from './types'
import { PersonMark, SectionHeading } from '../interno/WorkspaceUI'

export default function Profile({ account, token, onChanged }: { account: Account; token: string; onChanged: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const lock = useRef(false)
  return <div className="rep-management">
    <section className="rep-management-card workspace-profile-card" aria-labelledby="profile-title"><SectionHeading id="profile-title" title="Seus dados" description="Seu nome aparece para as pessoas da sua república."><PersonMark name={account.nome} /></SectionHeading>
      <div className="workspace-readonly"><span>E-mail da conta</span><p>{account.email}</p></div>
      <form className="rep-management-form" aria-busy={busy} onSubmit={event => {
        event.preventDefault()
        if (lock.current) return
        const nome = String(new FormData(event.currentTarget).get('nome') ?? '').trim()
        lock.current = true; setBusy(true); setError(''); setNotice('')
        void apiRequest('PATCH', '/me', token, { nome }).then(() => { setNotice('Nome atualizado.'); onChanged() }).catch(failure => setError(errorMessage(failure))).finally(() => { lock.current = false; setBusy(false) })
      }}>
        <label>Nome<input name="nome" autoComplete="name" maxLength={120} required defaultValue={account.nome} disabled={busy} /></label>
        <GlisseButton type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar nome'}</GlisseButton>
      </form>
      {notice && <p role="status">{notice}</p>}{error && <p className="rep-action-error" role="alert">{error}</p>}
    </section>
    <section className="rep-management-card rep-danger-zone"><SectionHeading title="Excluir minha conta" />
      <p>A exclusão encerra seu acesso e seus vínculos. O histórico financeiro permanece preservado. Quite as dívidas de todas as repúblicas e transfira a administração antes de continuar.</p>
      <GlisseButton tint="#9f3834" disabled={busy} onClick={() => setDeleting(true)}>Excluir minha conta</GlisseButton>
    </section>
    {deleting && <ActionDialog title="Confirmar exclusão da conta" confirm="Excluir conta definitivamente" danger onClose={() => setDeleting(false)} onSubmit={async data => {
      await apiRequest('DELETE', '/me', token, { senha: String(data.get('senha')) })
      endSession()
    }}>
      <p>Essa ação é definitiva. Confirme a senha da sua conta para encerrar o acesso.</p>
      <label>Senha atual<input type="password" name="senha" autoComplete="current-password" required maxLength={128} /></label>
      <label><input type="checkbox" required />Entendo que perderei o acesso à conta.</label>
    </ActionDialog>}
  </div>
}
