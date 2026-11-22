import ErrorNotice from '../interno/ErrorNotice'
import type { Feedback } from '../interno/feedback'
import { useEffect, useState } from 'react'
import { apiRequest, request } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import ActionDialog from './ActionDialog'
import type { Member } from './types'
import { errorFeedback } from './types'
import { Badge, EmptyState, PersonMark, SectionHeading } from '../interno/WorkspaceUI'

export default function Residents({ token, members, adminId, canManage, onChanged }: { token: string; members: Member[]; adminId: string; canManage: boolean; onChanged: () => void }) {
  const [all, setAll] = useState<Member[] | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [error, setError] = useState<Feedback>('')
  const [deactivating, setDeactivating] = useState<Member | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!showInactive || !canManage) return
    let active = true
    request<Member[]>('/membros?inativos=true', token).then(data => { if (active) { setAll(data); setError('') } }).catch(failure => { if (active) setError(errorFeedback(failure)) })
    return () => { active = false }
  }, [token, showInactive, canManage, revision])
  const displayed = showInactive && canManage ? all : members
  return <section className="rep-management-card workspace-residents" aria-labelledby="residents-title"><SectionHeading id="residents-title" title="Pessoas da casa" description={`${displayed?.length ?? '…'} moradores nesta lista`} />
    {canManage && <label className="rep-members-control"><input type="checkbox" checked={showInactive} onChange={event => { setShowInactive(event.target.checked); setError('') }} />Incluir moradores inativos</label>}
    {error && <ErrorNotice error={error} />}
    {!displayed ? <p role="status">Carregando moradores…</p> : !displayed.length ? <EmptyState title="Nenhum morador nesta lista." /> : <ul className="rep-management-list">{displayed.map(member => <li key={member.id}><div className="rep-management-row"><div className="workspace-resident-person"><PersonMark name={member.usuario.nome} userId={member.usuario.id} photo={member.ativo ? member.usuario.foto : null} token={token} context={member.republicaId} /><div><strong>{member.usuario.nome}</strong><small>{member.ativo && member.usuario.id === adminId ? 'Administrador da república' : 'Morador'}</small></div></div><div className="rep-management-actions"><Badge tone={member.ativo ? 'success' : 'neutral'}>{member.ativo ? member.usuario.id === adminId ? 'Administrador' : 'Morador ativo' : 'Vínculo inativo'}</Badge>
      {canManage && member.ativo && member.usuario.id !== adminId && <GlisseButton variant="secondary" aria-label={`Desativar vínculo de ${member.usuario.nome}`} onClick={() => setDeactivating(member)}>Desativar vínculo</GlisseButton>}
    </div></div></li>)}</ul>}
    {deactivating && <ActionDialog title="Desativar vínculo" confirm="Confirmar desativação" danger onClose={() => setDeactivating(null)} onSubmit={async () => {
      await apiRequest('PATCH', `/membros/${deactivating.id}`, token, { ativo: false })
      setRevision(value => value + 1); onChanged()
    }}><p>{deactivating.usuario.nome} deixará de ser morador ativo desta república. A conta e o histórico serão preservados.</p></ActionDialog>}
  </section>
}
