import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from './vendor/shadcn-combobox'
import './fields.css'

type Member = { id: string; usuario: { nome: string } }

export default function MemberPicker({ members }: { members: Member[] }) {
  const [selected, setSelected] = useState(members)
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  return <fieldset className="rep-participants">
    <legend>Dividir igualmente entre</legend>
    <Combobox multiple items={members} value={selected} onValueChange={setSelected}
      itemToStringLabel={(member: Member) => member.usuario.nome}
      itemToStringValue={(member: Member) => member.id}
      isItemEqualToValue={(a: Member, b: Member) => a.id === b.id}>
      <div ref={setAnchor} className="rep-combobox">
        <ComboboxInput aria-label="Buscar moradores no rateio" placeholder="Buscar moradores" />
        <ComboboxTrigger type="button" aria-label="Abrir moradores do rateio"><ChevronDown size={16} /></ComboboxTrigger>
      </div>
      <ComboboxContent container={anchor?.closest('dialog') ?? undefined} className="rep-combobox-popup">
        <ComboboxEmpty className="rep-combobox-empty">Nenhum morador encontrado.</ComboboxEmpty>
        <ComboboxList>{(member: Member) => <ComboboxItem className="rep-combobox-item" key={member.id} value={member}>{member.usuario.nome}</ComboboxItem>}</ComboboxList>
      </ComboboxContent>
    </Combobox>
    <p className="rep-rateio-count" role="status">{selected.length} de {members.length} moradores selecionados</p>
    {selected.map(member => <input key={member.id} type="hidden" name="membroIds" value={member.id} />)}
  </fieldset>
}
