import { useEffect, useRef } from 'react'
import { SegmentedControl } from 'glisse'

const options = ['Todas', 'Pendentes', 'Próximas', 'Atrasadas', 'Pagas'] as const
export type ExpenseFilter = typeof options[number]

export default function ExpenseFilters({ value, onChange }: { value: ExpenseFilter; onChange: (value: ExpenseFilter) => void }) {
  const viewport = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = viewport.current!
    const selected = node.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
    if (!selected) return
    const bounds = node.getBoundingClientRect(), item = selected.getBoundingClientRect()
    if (item.left < bounds.left) node.scrollLeft -= bounds.left - item.left
    else if (item.right > bounds.right) node.scrollLeft += item.right - bounds.right
  }, [value])
  return <div className="finance-filter-group">
    <div ref={viewport} className="finance-filters">
      <SegmentedControl className="workspace-expense-filter" aria-label="Filtrar despesas da casa" value={value} items={options.map(option => ({ value: option, label: option }))} onValueChange={option => onChange(option as ExpenseFilter)} />
    </div>
  </div>
}
