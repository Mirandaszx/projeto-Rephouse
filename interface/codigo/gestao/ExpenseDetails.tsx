import { useEffect, useRef, useState } from 'react'
import { apiRequest, brl, request } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import ActionDialog from './ActionDialog'
import Payments from './Payments'
import type { ExpenseDetail, Member, Schemas } from './types'
import { balance, civilDate, errorMessage } from './types'
import { RecurrenceFields } from './RecurringExpenses'
import { brasilDay, financialState } from '../interno/presentation'
import MemberPicker from '../rebuild/MemberPicker'

type Props = { id: string; token: string; members: Member[]; memberId?: string; canManage: boolean; onChanged: () => void; onClose: () => void }
export default function ExpenseDetails({ id, token, members, memberId, canManage, onChanged, onClose }: Props) {
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [total, setTotal] = useState('')
  const [attempt, setAttempt] = useState(0)
  const recurringKey = useRef(crypto.randomUUID())
  useEffect(() => {
    let active = true
    request<ExpenseDetail>(`/despesas/${id}`, token).then(value => { if (active) setExpense(value) }).catch(failure => { if (active) setError(errorMessage(failure)) })
    return () => { active = false }
  }, [id, token, attempt])
  const locked = expense?.rateios.some(share => Number(share.valorPago) > 0 || Boolean(share.pagamentos?.length)) ?? false
  return <ActionDialog title={editing ? 'Editar despesa' : 'Detalhes da despesa'} confirm={editing ? 'Salvar despesa' : 'Fechar detalhes'} onClose={onClose} onSubmit={async data => {
    if (!editing || !expense) return
    const input: Schemas['EditarDespesa'] = { titulo: String(data.get('titulo')).trim(), categoria: String(data.get('categoria')).trim(), vencimento: String(data.get('vencimento')) }
    if (!locked) {
      const value = String(data.get('valorTotal'))
      if (Number(value) !== Number(expense.valorTotal)) input.valorTotal = value
      const ids = data.getAll('membroIds').map(String).sort()
      if (!ids.length) throw new Error('Selecione pelo menos um morador para o rateio.')
      if (ids.join(',') !== expense.rateios.map(share => share.membroId).sort().join(',')) input.membroIds = ids
    }
    const saved = await apiRequest<ExpenseDetail>('PATCH', `/despesas/${id}`, token, input)
    if (data.get('repetir') === 'on') {
      await request('/recorrencias', token, { titulo: saved.titulo, categoria: saved.categoria, valorTotal: saved.valorTotal,
        diaVencimento: Number(saved.vencimento.slice(8,10)), inicio: String(data.get('inicio')), despesaOrigemId: id,
        membroIds: saved.rateios.map(share => share.membroId) }, { 'Idempotency-Key': recurringKey.current })
    }
    onChanged()
  }}>
    {error ? <div><p role="alert" className="rep-action-error">{error}</p><GlisseButton variant="secondary" onClick={() => { setError(''); setAttempt(value => value + 1) }}>Tentar carregar despesa</GlisseButton></div> : !expense ? <p role="status">Carregando despesa…</p> : editing ? <>
      <label>Descrição<input name="titulo" required maxLength={160} defaultValue={expense.titulo} /></label>
      <label>Categoria<input name="categoria" required maxLength={80} defaultValue={expense.categoria} /></label>
      <label>Vencimento<input type="date" name="vencimento" required defaultValue={expense.vencimento.slice(0, 10)} /></label>
      {locked && <p className="rep-management-note">Já existem pagamentos. Você pode editar descrição, categoria e vencimento; valor e participantes permanecem preservados.</p>}
      <label>Valor total (R$)<input type="number" name="valorTotal" required min="0.01" max="9999999999.99" step="0.01" disabled={locked} defaultValue={expense.valorTotal} onChange={event => setTotal(event.target.value)} /></label>
      {locked ? <p>Participantes e valores do rateio permanecem como registrados nos detalhes.</p> : <MemberPicker members={members} initialSelected={expense.rateios.map(share => share.membroId)} total={total} />}
      {!expense.recorrencia && !locked && <RecurrenceFields today={expense.dataReferencia ?? brasilDay()} due={expense.vencimento.slice(0,10)} origin />}
    </> : <>
      <div><h3>{expense.titulo}</h3><p>{expense.categoria} · Vence em {civilDate(expense.vencimento)}{expense.recorrencia ? ' · Recorrente' : ''}</p><p><strong>{brl.format(Number(expense.valorTotal))}</strong> · {financialState(expense.vencimento, expense.status === 'PAGA' ? 0 : 1, 0, expense.dataReferencia, expense.situacaoVencimento).label}</p>{expense.pagamentoParcial && <p>Há pagamentos parciais nesta conta.</p>}</div>
      {canManage && <GlisseButton variant="secondary" onClick={() => { setTotal(expense.valorTotal); setEditing(true) }}>Editar despesa</GlisseButton>}
      <div><h3>Rateios e pagamentos</h3>{expense.rateios.map(share => <section key={share.id} className="rep-management-card"><h4>{members.find(member => member.id === share.membroId)?.usuario.nome ?? 'Morador com histórico'}</h4><p>Parte: {brl.format(Number(share.valorDevido))} · Pago: {brl.format(Number(share.valorPago))} · Saldo: {brl.format(balance(share))}</p><Payments payments={share.pagamentos ?? []} token={token} canDownload={canManage || share.membroId === memberId} /></section>)}</div>
    </>}
  </ActionDialog>
}
