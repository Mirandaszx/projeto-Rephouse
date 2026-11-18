import { useEffect, useId, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SegmentedControl } from 'glisse'

const options = ['Todas', 'Pendentes', 'Próximas', 'Atrasadas', 'Pagas'] as const
export type ExpenseFilter = typeof options[number]

export default function ExpenseFilters({ value, onChange }: { value: ExpenseFilter; onChange: (value: ExpenseFilter) => void }) {
  const viewport = useRef<HTMLDivElement>(null)
  const hint = useId()
  const [edges, setEdges] = useState({ left: false, right: false })
  function measure() {
    const node = viewport.current
    if (node) setEdges({ left: node.scrollLeft > 2, right: node.scrollWidth - node.clientWidth - node.scrollLeft > 2 })
  }
  useEffect(() => {
    const node = viewport.current!
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    if (node.firstElementChild) observer.observe(node.firstElementChild)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const node = viewport.current!
    const selected = node.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
    if (!selected) return
    const bounds = node.getBoundingClientRect(), item = selected.getBoundingClientRect()
    if (item.left < bounds.left) node.scrollLeft -= bounds.left - item.left
    else if (item.right > bounds.right) node.scrollLeft += item.right - bounds.right
  }, [value])
  const scroll = (direction: number) => viewport.current?.scrollBy({ left: direction * viewport.current.clientWidth * .7, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  return <div className="finance-filter-group">
    <div className="finance-filter-track">
      {edges.left && <button type="button" className="finance-filter-arrow" aria-label="Mostrar filtros anteriores" onClick={() => scroll(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>}
      <div ref={viewport} className="finance-filters" onScroll={measure}>
        <SegmentedControl className="workspace-expense-filter" aria-label="Filtrar despesas da casa" aria-describedby={edges.left || edges.right ? hint : undefined} value={value} items={options.map(option => ({ value: option, label: option }))} onValueChange={option => onChange(option as ExpenseFilter)} />
      </div>
      {edges.right && <button type="button" className="finance-filter-arrow" aria-label="Mostrar mais filtros" onClick={() => scroll(1)}><ChevronRight size={18} aria-hidden="true" /></button>}
    </div>
    {(edges.left || edges.right) && <p id={hint} className="finance-filter-hint">Deslize ou use as setas para ver todos os filtros.</p>}
  </div>
}
