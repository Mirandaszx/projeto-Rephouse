import { useId } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useAppearance } from './appearance'

export default function AppearanceControl({ compact = false }: { compact?: boolean }) {
  const id = useId()
  const { preference, change } = useAppearance()
  const Icon = preference === 'system' ? Monitor : preference === 'dark' ? Moon : Sun
  return <div className="appearance-control" data-compact={compact}>
    <label htmlFor={id}><Icon size={18} aria-hidden="true" /><span>Aparência</span></label>
    <select id={id} aria-label="Aparência" title="Aparência: Sistema, Claro ou Escuro" value={preference} onChange={event => change(event.target.value as 'system' | 'light' | 'dark')}>
      <option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Escuro</option>
    </select>
  </div>
}
