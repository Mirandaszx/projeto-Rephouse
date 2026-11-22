import { useEffect, useState } from 'react'
import { ArrowUpRight, CheckCheck, ClipboardCheck, Clock3, ReceiptText, Wallet } from 'lucide-react'
import { request, brl as money } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import { Badge, EmptyState, PersonMark, SectionHeading } from '../interno/WorkspaceUI'
import { brasilDay, financialState } from '../interno/presentation'
import './overview.css'

export type Share = { id: string; membroId: string; valorDevido: string; valorPago: string; situacaoVencimento?: string; valorRestante?: string }
export type Expense = { id: string; titulo: string; categoria: string; valorTotal: string; vencimento: string; criadaEm: string; rateios: Share[]; dataReferencia?: string; situacaoVencimento?: string; recorrencia?: { id: string; competencia: string } | null }
type Task = { id: string; titulo: string; status: 'ABERTA' | 'CONCLUIDA'; prazo: string | null; responsavelId: string | null }
type Props = {
  token: string
  revision: number
  memberId?: string
  members: import('../gestao/types').Member[]
  expenses: Expense[]
  dashboard: { totalPendente: string; totalPagoNoMes: string; tarefasAbertas: number; dataReferencia?: string; financeiroIndividual?: import('../gestao/types').Schemas['ResumoIndividual']; financeiroIndividualGeral?: import('../gestao/types').Schemas['ResumoIndividual'] }
  disabled: boolean
  onPay: (expense: Expense, share: Share) => void
  onCreateExpense?: () => void
  onExpired: (error: unknown) => boolean
}
const balance = (share: Share) => Math.max(0, Math.round(Number(share.valorDevido) * 100) - Math.round(Number(share.valorPago) * 100))
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/')

export default function Overview({ token, revision, memberId, members, expenses, dashboard, disabled, onPay, onCreateExpense, onExpired }: Props) {
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

  const personal = Number(dashboard.financeiroIndividualGeral?.saldoPendente ?? '0.00') * 100
  const openShares = dashboard.financeiroIndividualGeral?.rateiosPendentes ?? 0
  const mine = expenses.flatMap(expense => expense.rateios.filter(share => share.membroId === memberId && balance(share) > 0).map(share => ({ expense, share }))).slice(0, 5)
  const personalPending = new Set(mine.map(item => item.expense.id))
  // As pendências pessoais já têm ação própria acima; os recentes mostram os outros registros.
  const recent = expenses.filter(expense => !personalPending.has(expense.id)).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm) || a.id.localeCompare(b.id)).slice(0, 5)
  const pending = tasks?.filter(task => task.status === 'ABERTA').sort((a, b) => (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') || a.id.localeCompare(b.id)).slice(0, 4)
  const today = brasilDay()
  const noFinancialActivity = personal === 0 && Number(dashboard.totalPendente) === 0 && Number(dashboard.totalPagoNoMes) === 0
  // Só mostrar a orientação inicial após confirmar os dados; falha e carregamento não são casa vazia.
  const emptyHouse = !error && tasks !== null && tasks.length === 0 && expenses.length === 0 && noFinancialActivity && dashboard.tarefasAbertas === 0

  const introduction = emptyHouse ? <div className="rep-overview-start">
    <h3>{onCreateExpense ? 'Comece pela primeira despesa.' : 'Os registros da casa ficam aqui.'}</h3>
    <p>{onCreateExpense ? 'Registre uma conta e escolha os moradores que vão dividi-la.' : 'Quando o administrador adicionar despesas e tarefas, você poderá acompanhar sua parte por aqui.'}</p>
    <div className="rep-overview-start-actions">{onCreateExpense && <GlisseButton variant="secondary" disabled={disabled} onClick={onCreateExpense}>Registrar primeira despesa</GlisseButton>}<a href={onCreateExpense ? '/republica/tarefas' : '/republica/moradores'}>{onCreateExpense ? 'Organizar tarefas' : 'Ver moradores'} <ArrowUpRight size={16} aria-hidden="true" /></a></div>
  </div> : null

  return <>
    <section className="rep-metrics" aria-label="Resumo da república">
      <div className="rep-metric rep-metric-personal"><span className="rep-metric-label"><Wallet size={20} aria-hidden="true" />Sua parte a pagar</span><strong>{money.format(personal / 100)}</strong><div className="rep-personal-foot"><small>{openShares} {openShares === 1 ? 'rateio' : 'rateios'} em aberto</small><a href="/republica/financeiro">Meu financeiro <ArrowUpRight size={17} aria-hidden="true" /></a></div></div>
      <div className="rep-metric-strip">
      <div className="rep-metric"><span className="rep-metric-label"><ReceiptText size={18} aria-hidden="true" />Em aberto na casa</span><strong>{money.format(Number(dashboard.totalPendente))}</strong><small>Pendências da república</small></div>
      <div className="rep-metric"><span className="rep-metric-label"><CheckCheck size={18} aria-hidden="true" />Pago neste mês</span><strong>{money.format(Number(dashboard.totalPagoNoMes))}</strong><small>Pagamentos da casa</small></div>
      <div className="rep-metric"><span className="rep-metric-label"><ClipboardCheck size={18} aria-hidden="true" />Tarefas abertas</span><strong>{dashboard.tarefasAbertas}</strong><a href="/republica/tarefas">Acompanhar tarefas <ArrowUpRight size={14} aria-hidden="true" /></a></div>
      </div>
    </section>
    {dashboard.financeiroIndividual && <div className="finance-period-summary" aria-label="Suas contas do mês"><span>Vencimento em {dashboard.financeiroIndividual.competencia?.split('-').reverse().join('/')}</span><span>Sua parte: {money.format(Number(dashboard.financeiroIndividual.totalDevido))}</span><span>Pago dessas contas: {money.format(Number(dashboard.financeiroIndividual.totalPago))}</span><span>Saldo do mês: {money.format(Number(dashboard.financeiroIndividual.saldoPendente))}</span></div>}
    {mine.length > 0 && <section className="finance-pending" aria-label="Minhas pendências"><SectionHeading title="Minhas pendências" description="Suas parcelas em aberto nesta república."><a href="/republica/financeiro">Ver meu histórico <ArrowUpRight size={15} aria-hidden="true" /></a></SectionHeading>{mine.map(({ expense, share }) => { const state = financialState(expense.vencimento, balance(share), Number(share.valorPago), expense.dataReferencia ?? dashboard.dataReferencia ?? today, share.situacaoVencimento ?? expense.situacaoVencimento); return <div className="finance-pending-row" key={share.id}><div><strong>{expense.titulo}</strong><small>Vence em {date(expense.vencimento)}</small><div className="finance-pending-statuses"><Badge tone={state.tone}>{state.label}</Badge>{Number(share.valorPago) > 0 && <Badge tone="warning">Pagamento parcial</Badge>}</div></div><strong>{money.format(Number(share.valorRestante ?? balance(share) / 100))}</strong><GlisseButton variant="secondary" disabled={disabled} onClick={() => onPay(expense, share)}>Registrar pagamento</GlisseButton></div>})}</section>}
    <div className="rep-overview-grid">
      <section className="rep-overview-panel" aria-labelledby="recent-expenses-title">
        <SectionHeading id="recent-expenses-title" title="Despesas recentes" description={mine.length ? 'Outros registros da casa.' : 'Os últimos registros da casa.'}><a href="/republica/despesas" aria-label="Ver todas as despesas">Ver todas <ArrowUpRight size={15} aria-hidden="true" /></a></SectionHeading>
        {!recent.length ? mine.length ? <EmptyState title="Nenhuma outra despesa por enquanto." /> : introduction ?? <><EmptyState title="Nenhuma despesa cadastrada." />{onCreateExpense && <GlisseButton variant="secondary" disabled={disabled} onClick={onCreateExpense}>Registrar despesa</GlisseButton>}</> : <ul className="rep-recent-expenses">{recent.map(expense => {
          const share = expense.rateios.find(item => item.membroId === memberId)
          const paid = expense.rateios.every(item => balance(item) === 0)
          return <li key={expense.id}>
            <div className="rep-recent-name"><strong>{expense.titulo}</strong><small>{expense.categoria} · Vence em {date(expense.vencimento)}</small></div>
            <div className="rep-recent-amount"><strong>{money.format(Number(expense.valorTotal))}</strong><small>{share ? 'Sua parte: ' + money.format(balance(share) / 100) : 'Fora do seu rateio'}</small></div>
            <div className="rep-recent-action">{share && balance(share) > 0 ? <GlisseButton variant="secondary" disabled={disabled} onClick={() => onPay(expense, share)}>Registrar pagamento</GlisseButton> : <Badge tone={paid || share ? 'success' : 'warning'}>{paid ? 'Paga' : share ? 'Sua parte paga' : 'Pendente'}</Badge>}</div>
          </li>
        })}</ul>}
      </section>
      <section className="rep-overview-panel" aria-labelledby="pending-tasks-title">
        <SectionHeading id="pending-tasks-title" title="Tarefas pendentes" description="Próximos afazeres da casa."><a href="/republica/tarefas" aria-label="Ver todas as tarefas">Ver todas <ArrowUpRight size={15} aria-hidden="true" /></a></SectionHeading>
        {error ? <div className="rep-panel-empty"><p role="alert">{error}</p><GlisseButton variant="secondary" onClick={() => { setError(''); setTasks(null); setAttempt(value => value + 1) }}>Tentar carregar tarefas</GlisseButton></div> : !pending ? <p className="rep-panel-loading" role="status">Carregando tarefas…</p> : !pending.length ? <EmptyState title="Tudo em dia nas tarefas." description="As próximas tarefas abertas aparecerão aqui." /> : <ul className="rep-pending-tasks">{pending.map(task => <li key={task.id}>
          <PersonMark name={members.find(member => member.id === task.responsavelId)?.usuario.nome ?? '?'} userId={members.find(member => member.id === task.responsavelId)?.usuario.id} photo={members.find(member => member.id === task.responsavelId)?.usuario.foto} context={members.find(member => member.id === task.responsavelId)?.republicaId} token={token} /><div><strong>{task.titulo}</strong><div className="rep-pending-task-meta"><small>{task.responsavelId === memberId ? 'Você' : members.find(member => member.id === task.responsavelId)?.usuario.nome ?? 'Responsável indisponível'}</small><span><Clock3 size={14} aria-hidden="true" />{task.prazo ? date(task.prazo) : 'Sem prazo definido'}</span>{task.prazo && task.prazo.slice(0, 10) < today && <Badge tone="danger">Em atraso</Badge>}</div></div>
        </li>)}</ul>}
      </section>
    </div>
  </>
}
