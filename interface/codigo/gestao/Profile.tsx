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
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<Feedback>('')
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
    {/* LGPD, art. 18 (26/11/2026): cópia dos dados e caminho para a política, ao lado da exclusão. */}
    <section className="rep-management-card" aria-labelledby="privacy-title"><SectionHeading id="privacy-title" title="Privacidade e seus dados" description="Baixe uma cópia de tudo o que o RepHouse guarda sobre você, em um arquivo que outros sistemas conseguem ler." />
      <div className="profile-privacy-actions">
        <GlisseButton variant="secondary" disabled={exporting} aria-busy={exporting} onClick={() => {
          setExporting(true); setExportError('')
          void apiRequest<unknown>('GET', '/me/dados', token).then(dados => {
            const link = document.createElement('a')
            link.href = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }))
            link.download = 'rephouse-meus-dados.json'
            link.click()
            setTimeout(() => URL.revokeObjectURL(link.href), 1000)
          }).catch(failure => setExportError(errorFeedback(failure))).finally(() => setExporting(false))
        }}>{exporting ? 'Preparando…' : 'Baixar meus dados'}</GlisseButton>
        <a href="/privacidade">Política de privacidade e termos</a>
      </div>
      {exportError && <ErrorNotice error={exportError} />}
    </section>
    <section className="rep-management-card rep-danger-zone"><SectionHeading title="Excluir minha conta" />
      <p>A exclusão encerra seu acesso e apaga seus dados pessoais: seu nome vira "Ex-morador" e seu e-mail, sua foto e o login com Google são removidos. As despesas e tarefas da casa continuam para os outros moradores, sem identificar você. Antes, quite as dívidas de todas as repúblicas e transfira a administração.</p>
      <GlisseButton tint="#9f3834" disabled={busy} onClick={() => setDeleting(true)}>Excluir minha conta</GlisseButton>
    </section>
    {deleting && <ActionDialog title="Confirmar exclusão da conta" confirm="Excluir conta definitivamente" danger onClose={() => setDeleting(false)} onSubmit={async data => {
      await apiRequest('DELETE', '/me', token, { senha: String(data.get('senha')) })
      endSession()
    }}>
      <p>Essa ação é definitiva. Confirme a senha da sua conta para encerrar o acesso.</p>
      <label>Senha atual<input type="password" name="senha" autoComplete="current-password" required maxLength={128} /></label>
      <label><input type="checkbox" required />Entendo que perderei o acesso e que meus dados pessoais serão apagados.</label>
    </ActionDialog>}
  </div>
}
