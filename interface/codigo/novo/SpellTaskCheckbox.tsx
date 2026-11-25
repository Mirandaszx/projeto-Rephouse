// Spell UI Animated Checkbox (MIT): https://spell.sh/docs/animated-checkbox
// Source: https://github.com/xxtomm/spell-ui/blob/main/registry/spell-ui/animated-checkbox.tsx
// RepHouse mantém o desenho do check com feedback curto e um input nativo controlado.
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { cn } from '../rebuild/vendor/cn'

type Props = { title: string; checked: boolean; disabled?: boolean; onCheckedChange: (checked: boolean) => void }

/** Só seleciona tarefas livres para assumir. Concluir e reabrir são botões, para nada mudar sem querer. */
export function SpellTaskCheckbox({ title, checked, disabled, onCheckedChange }: Props) {
  const reduced = useReducedMotion()
  const [instant, setInstant] = useState(false)
  return <label className={cn('rep-task-checkbox flex items-center gap-3 select-none', disabled ? 'cursor-default' : 'cursor-pointer')}>
    <input className="sr-only" type="checkbox" aria-label={`Selecionar tarefa ${title}`} checked={checked} disabled={disabled} onKeyDown={event => { if (event.key === ' ') setInstant(true) }} onPointerDown={() => setInstant(false)} onChange={event => onCheckedChange(event.currentTarget.checked)} />
    <span aria-hidden="true" className={cn('rep-task-checkmark size-4.5 shrink-0 rounded-[6px] flex items-center justify-center border-[1.5px] transition-colors duration-200', checked && 'rep-task-checkmark-done')}>
      <svg viewBox="0 0 20 20" className="size-full">
        <motion.path
          d="M 0 4.5 L 3.182 8 L 10 0" fill="transparent" stroke="currentColor" strokeWidth={1.5}
          strokeLinecap="round" strokeLinejoin="round" transform="translate(5 6)"
          initial={false} animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={reduced || instant ? { duration: 0 } : { pathLength: { ease: [.23, 1, .32, 1], duration: 0.16 }, opacity: { duration: 0 } }}
        />
      </svg>
    </span>
    <span className="rep-task-name relative font-medium">{title}</span>
  </label>
}
