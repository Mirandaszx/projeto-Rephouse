import { useRef, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Popover } from '@base-ui/react'
import { CalendarDays } from 'lucide-react'
import { ptBR } from 'react-day-picker/locale'
import { LabelInput } from './vendor/spell-label-input'
import { Calendar } from './vendor/shadcn-calendar'
import './fields.css'

export function AnimatedField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <LabelInput {...props} label={label} containerClassName="rep-animated-field" ringColor="green" />
}

export function DateField({ name, label, required }: { name: string; label: string; required?: boolean }) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const date = value ? new Date(value + 'T12:00:00') : undefined
  return <div ref={setAnchor} className="rep-date-field">
    <label>{label}<input ref={input} type="date" name={name} required={required} value={value}
      onChange={event => setValue(event.target.value)} /></label>
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger type="button" aria-label={'Abrir calendário de ' + label}><CalendarDays size={18} /></Popover.Trigger>
      <Popover.Portal container={anchor?.closest('dialog') ?? undefined}>
        <Popover.Positioner sideOffset={6} className="rep-calendar-positioner">
          <Popover.Popup className="rep-calendar-popup" aria-label={'Calendário de ' + label}>
            <Calendar locale={ptBR} mode="single" selected={date} onSelect={next => {
              if (!next) return
              setValue([next.getFullYear(), String(next.getMonth() + 1).padStart(2, '0'), String(next.getDate()).padStart(2, '0')].join('-'))
              setOpen(false)
              input.current?.focus()
            }} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  </div>
}
