import { useEffect, useState } from 'react'
import { ArrowUpRight, CheckCheck, ClipboardCheck, Clock3, ReceiptText, Wallet } from 'lucide-react'
import { request, brl as money } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import './overview.css'

export type Share = { id: string; membroId: string; valorDevido: string; valorPago: string }
export type Expense = { id: string; titulo: string; categoria: string; valorTotal: string; vencimento: string; criadaEm: string; rateios: Share[] }
type Task = { id: string; titulo: string; status: 'ABERTA' | 'CONCLUIDA'; prazo: string | null; responsavelId: string }
type Props = {
  token: string
  revision: number
  memberId?: string
  members: { id: string; usuario: { nome: string } }[]
  expenses: Expense[]
  dashboard: { totalPendente: string; totalPagoNoMes: string; tarefasAbertas: number }
  disabled: boolean
  onPay: (expense: Expense, share: Share) => void
  onExpired: (error: unknown) => boolean
}
const balance = (share: Share) => Math.max(0, Math.round(Number(share.valorDevido) * 100) - Math.round(Number(share.valorPago) * 100))
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/')

export default function Overview({ token, revision, memberId, members, expenses, dashboard, disabled, onPay, onExpired }: Props) {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    request<Task[]>('/tarefas', token).then(items => {
      if (active) { setTasks(items); setError('') }
    }).catch((failure: unknown) => {
      if (active && !onExpired(failure)) setError('Não foi possível carregar as tarefas agora.')
    })
    return () => { active = false }
  }, [token, revision, attempt, onExpired])

  const shares = expenses.flatMap(expense => expense.rateios.filter(share => share.membroId === memberId))
  const personal = shares.reduce((total, share) => total + balance(share), 0)
  // A API ordena despesas por vencimento. O resumo usa criação, sem alterar a lista original.
  const recent = [...expenses].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm) || a.id.localeCompare(b.id)).slice(0, 5)
  const pending = tasks?.filter(task => task.status === 'ABERTA').sort((a, b) => (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') || a.id.localeCompare(b.id)).slice(0, 4)

  return <>
    <section className="rep-metrics" aria-label="Resumo da república">
      <div className="rep-metric rep-metric-personal"><span className="rep-metric-label"><Wallet size={18} aria-hidden="true" />Sua parte a pagar</span><strong>{money.format(personal / 100)}</strong><small>{shares.filter(share => balance(share) > 0).length} rateios em aberto</small></div>
      <div className="rep-metric"><span className="rep-metric-label"><ReceiptText size={18} aria-hidden="true" />Em aberto na casa</span><strong>{money.format(Number(dashboard.totalPendente))}</strong><small>Pendências da república</small></div>
      <div className="rep-metric"><span className="rep-metric-label"><CheckCheck size={18} aria-hidden="true" />Pago neste mês</span><strong>{money.format(Number(dashboard.totalPagoNoMes))}</strong><small>Pagamentos da casa</small></div>
      <div className="rep-metric"><span className="rep-metric-label"><ClipboardCheck size={18} aria-hidden="true" />Tarefas abertas</span><strong>{dashboard.tarefasAbertas}</strong><a href="/republica/tarefas">Acompanhar tarefas <ArrowUpRight size={14} aria-hidden="true" /></a></div>
    </section>
    <div className="rep-overview-grid">
      <section className="rep-overview-panel" aria-labelledby="recent-expenses-title">
        <header className="rep-panel-heading"><div><h2 id="recent-expenses-title">Despesas recentes</h2><p>Os últimos registros da casa.</p></div><a href="/republica/despesas" aria-label="Ver todas as despesas">Ver todas <ArrowUpRight size={15} aria-hidden="true" /></a></header>
        {!recent.length ? <div className="rep-panel-empty"><ReceiptText size={26} aria-hidden="true" /><p>Nenhuma despesa por aqui.</p><small>As despesas cadastradas aparecerão neste espaço.</small></div> : <ul className="rep-recent-expenses">{recent.map(expense => {
          const share = expense.rateios.find(item => item.membroId === memberId)
          const paid = expense.rateios.every(item => balance(item) === 0)
          return <li key={expense.id}>
            <div className="rep-recent-name"><strong>{expense.titulo}</strong><small>{expense.categoria} · Vence em {date(expense.vencimento)}</small></div>
            <div className="rep-recent-amount"><strong>{money.format(Number(expense.valorTotal))}</strong><small>{share ? 'Sua parte: ' + money.format(balance(share) / 100) : 'Fora do seu rateio'}</small></div>
            <div className="rep-recent-action">{share && balance(share) > 0 ? <GlisseButton variant="secondary" disabled={disabled} onClick={() => onPay(expense, share)}>Pagar</GlisseButton> : <span className="rep-paid">{paid ? 'Paga' : share ? 'Sua parte paga' : 'Pendente'}</span>}</div>
          </li>
        })}</ul>}
      </section>
      <section className="rep-overview-panel" aria-labelledby="pending-tasks-title">
        <header className="rep-panel-heading"><div><h2 id="pending-tasks-title">Tarefas pendentes</h2><p>Próximos afazeres da casa.</p></div><a href="/republica/tarefas" aria-label="Ver todas as tarefas">Ver todas <ArrowUpRight size={15} aria-hidden="true" /></a></header>
        {error ? <div className="rep-panel-empty"><p role="alert">{error}</p><GlisseButton variant="secondary" onClick={() => { setError(''); setTasks(null); setAttempt(value => value + 1) }}>Tentar carregar tarefas</GlisseButton></div> : !pending ? <p className="rep-panel-loading" role="status">Carregando tarefas…</p> : !pending.length ? <div className="rep-panel-empty"><ClipboardCheck size={26} aria-hidden="true" /><p>Tudo em dia nas tarefas.</p><small>As próximas tarefas abertas aparecerão aqui.</small></div> : <ul className="rep-pending-tasks">{pending.map(task => <li key={task.id}>
          <span className="rep-task-symbol"><ClipboardCheck size={18} aria-hidden="true" /></span><div><strong>{task.titulo}</strong><small>{task.responsavelId === memberId ? 'Você' : members.find(member => member.id === task.responsavelId)?.usuario.nome ?? 'Responsável indisponível'}</small><span><Clock3 size={12} aria-hidden="true" />{task.prazo ? date(task.prazo) : 'Sem prazo definido'}</span></div>
        </li>)}</ul>}
      </section>
    </div>
  </>
}
