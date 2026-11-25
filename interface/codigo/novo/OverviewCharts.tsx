import { brl as money } from '../api'
import { EmptyState, SectionHeading } from '../interno/WorkspaceUI'
import type { Expense } from './Overview'

const compact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
const monthName = (key: string, month: 'short' | 'long') =>
  new Intl.DateTimeFormat('pt-BR', { month, timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`)).replace('.', '')

/** Soma das contas da casa por mês de vencimento: 4 meses anteriores, o atual e o próximo. */
export function MonthlyExpenses({ expenses, today }: { expenses: Expense[]; today: string }) {
  const [year, month] = today.slice(0, 7).split('-').map(Number) as [number, number]
  const months = Array.from({ length: 6 }, (_, index) => new Date(Date.UTC(year, month - 5 + index, 1)).toISOString().slice(0, 7))
  const totals = months.map(key => expenses.filter(expense => expense.vencimento.slice(0, 7) === key)
    .reduce((total, expense) => total + Math.round(Number(expense.valorTotal) * 100), 0))
  const highest = Math.max(...totals, 1)
  const current = today.slice(0, 7)
  return <section className="rep-overview-panel rep-chart-card" aria-labelledby="monthly-expenses-title">
    <SectionHeading id="monthly-expenses-title" title="Despesas da casa por mês" description="Soma das contas pelo mês de vencimento." />
    {/* Sem nenhuma conta, barras vazias pareceriam dados: uma frase diz o que acontece. */}
    {totals.every(total => total === 0) ? <EmptyState title="Nenhuma conta venceu nesses meses." /> : <ol className="rep-bars">{months.map((key, index) => <li key={key} data-current={key === current || undefined}>
      <span className="rep-bar-value">{totals[index] ? compact.format(totals[index]! / 100) : '—'}</span>
      <span className="rep-bar-track" aria-hidden="true"><span className="rep-bar" style={{ blockSize: `${totals[index] ? Math.max(totals[index]! / highest * 100, 4) : 0}%` }} /></span>
      <span className="rep-bar-month"><span aria-hidden="true">{monthName(key, 'short')}</span><span className="visually-hidden">{monthName(key, 'long')}: {money.format(totals[index]! / 100)}</span></span>
    </li>)}</ol>}
  </section>
}

type MonthSummary = { competencia?: string | null; totalDevido: string; totalPago: string; saldoPendente: string }

/** Quanto da sua parte do mês já foi paga, em uma barra só. */
export function MyMonth({ summary }: { summary: MonthSummary }) {
  const owed = Number(summary.totalDevido), paid = Number(summary.totalPago), left = Number(summary.saldoPendente)
  const progress = owed > 0 ? Math.min(100, paid / owed * 100) : 0
  const period = summary.competencia ? monthName(summary.competencia.slice(0, 7), 'long') : 'este mês'
  return <section className="rep-overview-panel rep-chart-card rep-my-month" aria-labelledby="my-month-title">
    <SectionHeading id="my-month-title" title="Seu mês" description={`Sua parte nas contas que vencem em ${period}.`} />
    <strong className="rep-my-month-status">{left > 0 ? `Faltam ${money.format(left)}` : owed > 0 ? 'Tudo pago' : 'Nada para pagar'}</strong>
    <div className="rep-meter" role="img" aria-label={`Você pagou ${money.format(paid)} de ${money.format(owed)}`}><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
    <p className="rep-my-month-detail">Pago {money.format(paid)} de {money.format(owed)}</p>
  </section>
}
