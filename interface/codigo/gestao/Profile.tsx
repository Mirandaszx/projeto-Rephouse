import ErrorNotice from '../interno/ErrorNotice'
import type { Feedback } from '../interno/feedback'
import { useRef, useState } from 'react'
import { apiRequest, endSession } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import ActionDialog from './ActionDialog'
import type { Account } from './types'
import { errorFeedback } from './types'
import { SectionHeading } from '../interno/WorkspaceUI'
import ProfilePhoto from '../perfil/ProfilePhoto'

export default function Profile({ account, token, onChanged }: { account: Account; token: string; onChanged: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Feedback>('')
  const [notice, setNotice] = useState('')
  const lock = useRef(false)
  return <div className="rep-management">
    <ProfilePhoto account={account} token={token} onChanged={onChanged} />
    <section className="rep-management-card workspace-profile-card" aria-labelledby="profile-title"><SectionHeading id="profile-title" title="Seus dados" description="Seu nome aparece para as pessoas da sua república." />
      <form className="rep-management-form" aria-busy={busy} onSubmit={event => {
        event.preventDefault()
        if (lock.current) return
        const nome = String(new FormData(event.currentTarget).get('nome') ?? '').trim()
        lock.current = true; setBusy(true); setError(''); setNotice('')
        void apiRequest('PATCH', '/me', token, { nome }).then(() => { setNotice('Nome atualizado.'); onChanged() }).catch(failure => setError(errorFeedback(failure))).finally(() => { lock.current = false; setBusy(false) })
      }}>
        <label>Nome<input name="nome" autoComplete="name" maxLength={120} required defaultValue={account.nome} disabled={busy} /></label>
        <GlisseButton type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar nome'}</GlisseButton>
      </form>
      {notice && <p role="status">{notice}</p>}{error && <ErrorNotice error={error} />}
    </section>
    <section className="rep-management-card" aria-labelledby="account-details-title"><SectionHeading id="account-details-title" title="Sua conta e sua casa" />
      <dl className="profile-account-details">
        <div><dt>E-mail da conta</dt><dd>{account.email}</dd></div>
        <div><dt>Confirmação por e-mail</dt><dd>{account.emailConfirmadoEm === undefined ? 'Informação de confirmação indisponível' : account.emailConfirmadoEm ? 'Confirmado por link' : 'E-mail ainda não confirmado'}</dd></div>
        <div><dt>Cadastro no RepHouse</dt><dd>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long' }).format(new Date(account.criadoEm))}</dd></div>
        <div><dt>República atual</dt><dd>{account.membro?.republica.nome ?? 'Sem vínculo ativo com uma república'}</dd></div>
        <div><dt>Sua função</dt><dd>{account.tipoUsuario === 'USUARIO_MASTER' ? 'MASTER' : account.membro ? account.membro.republica.adminId === account.id ? 'Administra a república' : 'Mora na república' : 'Sem função em uma república'}</dd></div>
      </dl>
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
