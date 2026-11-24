import { CheckCheck, ClipboardCheck, Plus, Wallet } from 'lucide-react'
import { brl as money } from '../api'
import type { Expense, Share } from './Overview'

type Props = {
  memberId?: string
  expenses: Expense[]
  owed: number
  disabled: boolean
  onPay: (expense: Expense, share: Share) => void
  onCreateExpense?: () => void
  onFullMode: () => void
}
const balance = (share: Share) => Math.max(0, Math.round(Number(share.valorDevido) * 100) - Math.round(Number(share.valorPago) * 100))
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/')

/** Visão geral do Modo simples: quanto eu devo, o que pagar e três ações grandes. */
export default function SimpleOverview({ memberId, expenses, owed, disabled, onPay, onCreateExpense, onFullMode }: Props) {
  const mine = expenses.flatMap(expense => expense.rateios.filter(share => share.membroId === memberId && balance(share) > 0).map(share => ({ expense, share })))
    .sort((a, b) => a.expense.vencimento.localeCompare(b.expense.vencimento))
  return <div className="simple-overview">
    <section className="simple-owed" aria-labelledby="simple-owed-title">
      <h2 id="simple-owed-title">{owed > 0 ? 'Quanto eu devo' : 'Minhas contas'}</h2>
      {owed > 0 ? <strong>{money.format(owed / 100)}</strong> : <strong className="simple-settled"><CheckCheck size={32} aria-hidden="true" />Você está em dia</strong>}
    </section>
    <nav className="simple-actions" aria-label="O que você quer fazer">
      <a href="#simple-to-pay"><Wallet size={26} aria-hidden="true" />Pagar minha parte</a>
      {onCreateExpense && <button type="button" disabled={disabled} onClick={onCreateExpense}><Plus size={26} aria-hidden="true" />Registrar uma conta</button>}
      <a href="/republica/tarefas"><ClipboardCheck size={26} aria-hidden="true" />Minhas tarefas</a>
    </nav>
    <section id="simple-to-pay" className="simple-to-pay" aria-labelledby="simple-to-pay-title" tabIndex={-1}>
      <h2 id="simple-to-pay-title">Contas para pagar</h2>
      {mine.length === 0 ? <p>Nenhuma conta sua em aberto.</p> : <ul>{mine.map(({ expense, share }) => <li key={share.id}>
        <div><strong>{expense.titulo}</strong><span>Vence em {date(expense.vencimento)}</span></div>
        <strong className="simple-amount">{money.format(balance(share) / 100)}</strong>
        <button type="button" disabled={disabled} onClick={() => onPay(expense, share)}>Pagar</button>
      </li>)}</ul>}
    </section>
    <button type="button" className="simple-switch" onClick={onFullMode}>Ver todas as informações (modo completo)</button>
  </div>
}
