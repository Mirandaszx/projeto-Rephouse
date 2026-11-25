import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { ChoiceSelect } from '../rebuild/ChoiceSelect'
import { GlisseButton } from '../rebuild/GlisseButton'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '../rebuild/vendor/shadcn-drawer'
import type { ExpenseFilter } from './ExpenseFilters'
import { MonthFilter } from './MonthFilter'

type Scope = string
type Props = { filter: ExpenseFilter; onFilter: (value: ExpenseFilter) => void; month: string; onMonth: (value: string) => void; scope: Scope; onScope: (value: Scope) => void }

const situations: ExpenseFilter[] = ['Todas', 'Pendentes', 'Próximas', 'Atrasadas', 'Pagas']
const monthName = (value: string) => {
  const text = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Filtros de Despesas no celular (shadcn Drawer sobre Base UI, 25/11/2026): um botão mostra o filtro atual
 * e abre um painel que sobe de baixo, com controles grandes. No computador os filtros ficam na página.
 */
export function MobileExpenseFilters({ filter, onFilter, month, onMonth, scope, onScope }: Props) {
  const [open, setOpen] = useState(false)
  const summary = [filter, month ? monthName(month) : 'Todos os meses', scope === 'CASA' ? 'Contas da casa' : 'Minha parte'].join(' · ')
  return <div className="rep-mobile-filters">
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="rep-mobile-filters-trigger" aria-label={`Filtrar despesas: ${summary}`}>
        <SlidersHorizontal size={18} aria-hidden="true" /><span><strong>Filtrar despesas</strong><small>{summary}</small></span>
      </DrawerTrigger>
      <DrawerContent container={document.querySelector<HTMLElement>('.rep-internal') ?? undefined} className="rep-drawer">
        <DrawerHeader><DrawerTitle>Filtrar despesas</DrawerTitle><DrawerDescription>Escolha o que aparece na lista.</DrawerDescription></DrawerHeader>
        <div className="rep-drawer-body">
          <ChoiceSelect label="Situação" value={filter} onChange={value => onFilter(value as ExpenseFilter)} items={situations.map(value => ({ value, label: value }))} />
          <MonthFilter label="Mês do vencimento" value={month} onChange={onMonth} />
          {month && <GlisseButton variant="secondary" onClick={() => onMonth('')}>Todos os meses</GlisseButton>}
          <ChoiceSelect label="Valores e filtros" value={scope} onChange={value => onScope(value)} items={[{ value: 'CASA', label: 'Contas da casa' }, { value: 'PESSOAL', label: 'Minha parte' }]} />
        </div>
        <DrawerFooter><GlisseButton onClick={() => setOpen(false)}>Ver despesas</GlisseButton></DrawerFooter>
      </DrawerContent>
    </Drawer>
  </div>
}
