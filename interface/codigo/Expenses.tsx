import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { brl, request } from './api'

type Share = { id: string; membroId: string; valorDevido: string; valorPago: string }
type Expense = { id: string; titulo: string; categoria: string; valorTotal: string; vencimento: string; rateios: Share[] }
type Member = { id: string; usuario: { nome: string } }
type Props = { token: string; memberId?: string; canCreate: boolean; onPayment: () => void }

function remaining(share: Share) {
  return Math.max(0, Math.round(Number(share.valorDevido) * 100) - Math.round(Number(share.valorPago) * 100))
}

export default function Expenses({ token, memberId, canCreate, onPayment }: Props) {
  const [expenses, setExpenses] = useState<Expense[] | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [creating, setCreating] = useState(false)
  const [payment, setPayment] = useState<Share | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [loadError, setLoadError] = useState('')
  const paymentKey = useRef('')

  useEffect(() => {
    let active = true
    request<Expense[]>('/despesas', token).then(items => {
      if (active) { setExpenses(items); setLoadError('') }
    }).catch(err => {
      if (active) setLoadError((err as Error).message)
    })
    return () => { active = false }
  }, [token, revision])

  async function startCreate() {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      setMembers(await request<Member[]>('/membros', token))
      setCreating(true)
      setPayment(null)
    } catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (payment) {
        const file = data.get('comprovante')
        if (file instanceof File && file.size > 5 * 1024 * 1024) throw new Error('O comprovante deve ter até 5 MB.')
        if (file instanceof File && file.size === 0) data.delete('comprovante')
        data.set('rateioId', payment.id)
        await request('/pagamentos', token, data, { 'Idempotency-Key': paymentKey.current })
        setPayment(null)
        setNotice('Pagamento registrado.')
      } else {
        const membroIds = data.getAll('membroIds')
        if (membroIds.length === 0) throw new Error('Selecione pelo menos um morador.')
        await request('/despesas', token, {
          titulo: data.get('titulo'), categoria: data.get('categoria'),
          valorTotal: data.get('valorTotal'), vencimento: data.get('vencimento'), membroIds,
        })
        setCreating(false)
        setNotice('Despesa cadastrada com rateio.')
      }
      setRevision(value => value + 1)
      onPayment()
    } catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }

  return <section className="expense-section" aria-labelledby="expenses-title">
    <div className="expense-heading">
      <div><h2 id="expenses-title">Despesas da casa</h2><p>Acompanhe as contas e registre seus pagamentos.</p></div>
      {canCreate && !creating && !payment && <button className="primary" disabled={busy} onClick={() => void startCreate()}>Nova despesa</button>}
    </div>
    {error && <p className="notice" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {creating && <form className="panel expense-form" onSubmit={submit}>
      <h3>Cadastrar despesa</h3>
      <label>Título<input name="titulo" required maxLength={160} /></label>
      <label>Categoria<input name="categoria" required maxLength={80} /></label>
      <label>Valor total<input name="valorTotal" type="number" min="0.01" max="9999999999.99" step="0.01" required /></label>
      <label>Vencimento<input name="vencimento" type="date" required /></label>
      <fieldset><legend>Moradores no rateio</legend>
        {members.map(member => <label className="check-row" key={member.id}><input type="checkbox" name="membroIds" value={member.id} />{member.usuario.nome}</label>)}
        {members.length === 0 && <p>Nenhum morador disponível.</p>}
      </fieldset>
      <div className="choices"><button className="primary" disabled={busy}>Cadastrar despesa</button><button type="button" className="quiet" disabled={busy} onClick={() => { setCreating(false); setError('') }}>Cancelar</button></div>
    </form>}
    {payment && <form className="panel expense-form" onSubmit={submit} onChange={() => { paymentKey.current = crypto.randomUUID() }}>
      <h3>Registrar pagamento</h3>
      <p>Restante do seu rateio: {brl.format(remaining(payment) / 100)}</p>
      <label>Valor pago<input name="valor" type="number" min="0.01" max={remaining(payment) / 100} step="0.01" defaultValue={(remaining(payment) / 100).toFixed(2)} required /></label>
      <label>Comprovante (opcional)<input name="comprovante" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" /></label>
      <div className="choices"><button className="primary" disabled={busy}>Confirmar pagamento</button><button type="button" className="quiet" disabled={busy} onClick={() => { setPayment(null); setError('') }}>Cancelar</button></div>
    </form>}
    {loadError && <div><p role="alert">{loadError}</p><button className="quiet" onClick={() => { setLoadError(''); setRevision(value => value + 1) }}>Recarregar despesas</button></div>}
    {!expenses && !loadError && <p role="status">Carregando despesas…</p>}
    {expenses?.length === 0 && <p>Nenhuma despesa cadastrada.</p>}
    <ul className="expense-list">
      {expenses?.map(expense => {
        const share = expense.rateios.find(item => item.membroId === memberId)
        return <li key={expense.id} className="panel expense-row">
          <div><h3>{expense.titulo}</h3><p>{expense.categoria} · {expense.vencimento.slice(0, 10).split('-').reverse().join('/')}</p></div>
          <div><strong>{brl.format(Number(expense.valorTotal))}</strong>
            {share && <p>Seu saldo: {brl.format(remaining(share) / 100)}</p>}
          </div>
          {share && remaining(share) > 0 && <button className="quiet" disabled={busy || creating || Boolean(payment)} onClick={() => {
            paymentKey.current = crypto.randomUUID()
            setError('')
            setNotice('')
            setPayment(share)
          }}>Registrar pagamento</button>}
        </li>
      })}
    </ul>
  </section>
}
