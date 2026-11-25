import { useId, useState } from 'react'
import { Popover } from '@base-ui/react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/**
 * Filtro de mês e ano. Substitui o <input type="month">, que no Firefox vira uma caixa de texto.
 * `value` é "AAAA-MM" ou vazio (todos os meses), como a API espera.
 */
export function MonthFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId()
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [selectedYear, selectedMonth] = value ? value.split('-').map(Number) : []
  const [year, setYear] = useState(() => new Date().getFullYear())
  const today = new Date()
  return <div className="month-filter" ref={setAnchor}>
    <span id={`${id}-label`} className="month-filter-label">{label}</span>
    <Popover.Root open={open} onOpenChange={next => {
      // Reabre sempre no ano do que está escolhido.
      if (next) setYear(selectedYear ?? new Date().getFullYear())
      setOpen(next)
    }}>
      <Popover.Trigger type="button" className="choice-select-trigger month-filter-trigger" aria-labelledby={`${id}-label ${id}-value`}>
        <span id={`${id}-value`}>{value ? `${meses[selectedMonth - 1]} de ${selectedYear}` : 'Todos os meses'}</span>
        <span className="choice-select-icon"><CalendarDays size={18} aria-hidden="true" /></span>
      </Popover.Trigger>
      <Popover.Portal container={anchor?.closest<HTMLElement>('dialog, .rep-internal') ?? undefined}>
        <Popover.Positioner className="choice-select-positioner" sideOffset={6} align="start">
          <Popover.Popup className="choice-select-popup month-filter-popup" aria-label="Escolher mês e ano">
            <div className="month-filter-year">
              <button type="button" aria-label="Ano anterior" disabled={year <= 2000} onClick={() => setYear(year - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
              <strong aria-live="polite">{year}</strong>
              <button type="button" aria-label="Próximo ano" disabled={year >= 2199} onClick={() => setYear(year + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
            </div>
            <div className="month-filter-grid" role="group" aria-label={`Meses de ${year}`}>
              {meses.map((name, index) => <button key={name} type="button" aria-label={`${name} de ${year}`}
                aria-pressed={selectedYear === year && selectedMonth === index + 1}
                aria-current={today.getFullYear() === year && today.getMonth() === index ? 'date' : undefined}
                onClick={() => { onChange(`${year}-${String(index + 1).padStart(2, '0')}`); setOpen(false) }}>{name.slice(0, 3)}</button>)}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  </div>
}
