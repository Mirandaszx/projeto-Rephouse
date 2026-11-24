import { useState } from 'react'
import { Select } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'

type Item = { value: string; label: string }
type Props = { label: string; value: string; items: Item[]; onChange: (value: string) => void }

/**
 * Seleção de poucas opções no lugar do <select> nativo, cuja lista é desenhada pelo sistema e não anima.
 * Base UI cuida de teclado, leitor de tela e foco; a lista nasce do campo (ver workspace.css).
 */
export function ChoiceSelect({ label, value, items, onChange }: Props) {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  return <div className="choice-select" ref={setAnchor}>
    <Select.Root items={items} value={value} onValueChange={next => { if (typeof next === 'string') onChange(next) }}>
      <Select.Label className="choice-select-label">{label}</Select.Label>
      <Select.Trigger className="choice-select-trigger">
        <Select.Value />
        <Select.Icon className="choice-select-icon"><ChevronDown size={16} aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal container={anchor?.closest<HTMLElement>('dialog, .rep-internal') ?? undefined}>
        <Select.Positioner className="choice-select-positioner" sideOffset={6} alignItemWithTrigger={false}>
          <Select.Popup className="choice-select-popup">
            <Select.List>{items.map(item => <Select.Item key={item.value} value={item.value} className="choice-select-item">
              <Select.ItemText>{item.label}</Select.ItemText>
              <Select.ItemIndicator className="choice-select-check"><Check size={16} aria-hidden="true" /></Select.ItemIndicator>
            </Select.Item>)}</Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  </div>
}
