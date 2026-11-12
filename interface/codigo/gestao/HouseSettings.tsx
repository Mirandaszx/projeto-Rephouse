import { useRef, useState } from 'react'
import { apiRequest } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import ActionDialog from './ActionDialog'
import type { House, Member } from './types'
import { errorMessage } from './types'
import { SectionHeading } from '../interno/WorkspaceUI'

type Props = { house: House; members: Member[]; token: string; canManage: boolean; onChanged: () => void }
export default function HouseSettings({ house, members, token, canManage, onChanged }: Props) {
  const [action, setAction] = useState<'transfer' | 'leave' | 'swap' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const candidates = members.filter(member => member.ativo && member.usuario.id !== house.adminId)
  return <div className="rep-management">
    <section className="rep-management-card workspace-settings-data"><SectionHeading title="Dados da república" description="As informações que identificam a sua casa." />
      {canManage ? <form className="rep-management-form" aria-busy={busy} onSubmit={event => {
        event.preventDefault(); if (lock.current) return
        const data = new FormData(event.currentTarget)
        lock.current = true; setBusy(true); setError(''); setNotice('')
        void apiRequest('PATCH', '/republicas/atual', token, { nome: String(data.get('nome')).trim(), endereco: String(data.get('endereco')).trim() || null })
          .then(() => { setNotice('República atualizada.'); onChanged() }).catch(failure => setError(errorMessage(failure))).finally(() => { lock.current = false; setBusy(false) })
      }}>
        <label>Nome da república<input name="nome" required maxLength={120} defaultValue={house.nome} disabled={busy} /></label>
        <label>Endereço opcional<input name="endereco" maxLength={255} defaultValue={house.endereco ?? ''} disabled={busy} /></label>
        <GlisseButton type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar república'}</GlisseButton>
      </form> : <><p>{house.nome}</p><p>{house.endereco || 'Endereço não informado.'}</p><p className="rep-management-note">Somente a administração pode editar os dados.</p></>}
      {notice && <p role="status">{notice}</p>}{error && <p className="rep-action-error" role="alert">{error}</p>}
    </section>
    {canManage && <section className="rep-management-card workspace-settings-action"><SectionHeading title="Transferir administração" /><p>O novo administrador assume a gestão. Sua conta passa a ser morador e seu histórico permanece na casa.</p>
      <GlisseButton variant="secondary" disabled={busy || !candidates.length} onClick={() => setAction('transfer')}>Transferir administração</GlisseButton>
      {!candidates.length && <p className="rep-management-note">Convide outro morador ativo para receber a administração.</p>}
    </section>}
    <section className="rep-management-card workspace-settings-action"><SectionHeading title="Mudar de casa" /><p>Ao sair ou trocar, seu histórico e suas dívidas continuam disponíveis em Meu financeiro. {canManage && 'Transfira a administração antes de sair.'}</p>
      <div className="rep-management-actions"><GlisseButton variant="secondary" disabled={busy} onClick={() => setAction('swap')}>Trocar de república</GlisseButton><GlisseButton variant="secondary" disabled={busy} onClick={() => setAction('leave')}>Sair da república</GlisseButton></div>
    </section>
    {action && <ActionDialog title={action === 'transfer' ? 'Confirmar transferência de administração' : action === 'swap' ? 'Confirmar troca de república' : 'Confirmar saída da república'} confirm={action === 'transfer' ? 'Confirmar transferência' : action === 'swap' ? 'Confirmar troca' : 'Confirmar saída'} danger={action === 'leave'} onClose={() => setAction(null)} onSubmit={async data => {
      if (action === 'transfer') {
        await apiRequest('POST', '/republicas/transferir-admin', token, { membroId: String(data.get('membroId')) })
        onChanged()
      } else {
        await apiRequest('POST', action === 'swap' ? '/republicas/trocar' : '/republicas/sair', token, action === 'swap' ? { codigoEntrada: String(data.get('codigoEntrada')).trim().toUpperCase() } : {})
        window.location.assign('/republica')
      }
    }}>
      {action === 'transfer' ? <><p>Você perderá as permissões de administrador após confirmar.</p><label>Novo administrador<select name="membroId" aria-label="Novo administrador" required defaultValue=""><option value="" disabled>Selecione um morador</option>{candidates.map(member => <option key={member.id} value={member.id}>{member.usuario.nome}</option>)}</select></label></>
        : <><p>{action === 'swap' ? 'Seu vínculo atual será encerrado somente se o código da nova casa for válido.' : `Você deixará ${house.nome}. Seu acesso à conta continua disponível.`}</p>{action === 'swap' && <label>Código da nova república<input name="codigoEntrada" required minLength={6} maxLength={32} autoCapitalize="characters" spellCheck={false} /></label>}</>}
    </ActionDialog>}
  </div>
}
