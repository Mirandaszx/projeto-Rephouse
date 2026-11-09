import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from './vendor/shadcn-combobox'
import './fields.css'

type Item = { value: string; label: string }
type Props = { value: string; onChange: (value: string) => void; items: Item[]; label: string }

export default function FilterCombobox({ value, onChange, items, label }: Props) {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  return <Combobox items={items} value={items.find(item => item.value === value) ?? null}
    itemToStringLabel={(item: Item) => item.label} itemToStringValue={(item: Item) => item.value}
    isItemEqualToValue={(a: Item, b: Item) => a.value === b.value}
    onValueChange={(item: Item | null) => { if (item) onChange(item.value) }}>
    <div ref={setAnchor} className="rep-combobox">
      <ComboboxInput aria-label={label} placeholder={label} />
      <ComboboxTrigger type="button" aria-label={label + ' — abrir opções'}><ChevronDown size={15} aria-hidden="true" /></ComboboxTrigger>
    </div>
    <ComboboxContent container={anchor?.closest('dialog') ?? undefined} className="rep-combobox-popup">
      <ComboboxEmpty className="rep-combobox-empty">Nenhum resultado.</ComboboxEmpty>
      <ComboboxList>{(item: Item) => <ComboboxItem className="rep-combobox-item" key={item.value} value={item}>{item.label}</ComboboxItem>}</ComboboxList>
    </ComboboxContent>
  </Combobox>
}
