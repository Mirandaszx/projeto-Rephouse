import { useId } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useAppearance } from './appearance'
import ThemeSwitch from './ThemeSwitch'

export default function AppearanceControl({ compact = false, manualOnly = false }: { compact?: boolean; manualOnly?: boolean }) {
  const id = useId()
  const { preference, theme, change } = useAppearance()
  const value = manualOnly ? theme : preference
  const Icon = value === 'system' ? Monitor : value === 'dark' ? Moon : Sun
  if (manualOnly) return <ThemeSwitch />
  return <div className="appearance-control" data-compact={compact}>
    <label htmlFor={id}><Icon size={18} aria-hidden="true" /><span>Aparência</span></label>
    <select id={id} aria-label="Aparência" title={manualOnly ? 'Aparência: Claro ou Escuro' : 'Aparência: Sistema, Claro ou Escuro'} value={value} onChange={event => change(event.target.value as 'system' | 'light' | 'dark')}>
      {!manualOnly && <option value="system">Sistema</option>}<option value="light">Claro</option><option value="dark">Escuro</option>
    </select>
  </div>
}
