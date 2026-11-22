import { useRef, useState, type PointerEvent } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAppearance } from './appearance'

/** A preferência só muda ao soltar: arrastos cancelados não alteram o tema. */
export default function ThemeSwitch() {
  const { theme, change } = useAppearance()
  const gesture = useRef<{ pointer: number; start: number; fraction: number; moved: boolean } | null>(null)
  const [position, setPosition] = useState<number | null>(null)
  const [keyboard, setKeyboard] = useState(false)
  const dark = theme === 'dark'
  function start(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return
    gesture.current = { pointer: event.pointerId, start: event.clientX, fraction: dark ? 1 : 0, moved: false }
    setKeyboard(false)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current
    if (!current || current.pointer !== event.pointerId) return
    const delta = event.clientX - current.start
    if (Math.abs(delta) > 4) current.moved = true
    if (current.moved) setPosition(Math.max(0, Math.min(1, current.fraction + delta / ((event.currentTarget.clientWidth - 8) / 2))))
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current
    if (!current || current.pointer !== event.pointerId) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const fraction = current.moved ? current.fraction + (event.clientX - current.start) / ((event.currentTarget.clientWidth - 8) / 2) : (event.clientX - bounds.left) / bounds.width
    gesture.current = null
    setPosition(null)
    change(fraction >= 0.5 ? 'dark' : 'light')
  }
  function cancel() { gesture.current = null; setPosition(null) }
  return <button type="button" role="switch" aria-label="Modo escuro" aria-checked={dark}
    title="Claro ou Escuro — clique ou arraste" className="appearance-switch"
    data-dark={dark} data-dragging={position !== null} data-keyboard={keyboard}
    onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel}
    onClick={event => { if (event.detail === 0) { setKeyboard(true); change(dark ? 'light' : 'dark') } }}
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault(); cancel(); setKeyboard(true)
      change(event.key === 'ArrowLeft' || event.key === 'Home' ? 'light' : 'dark')
    }}>
    <span className="appearance-switch-thumb" aria-hidden="true" style={{ transform: `translateX(${(position ?? (dark ? 1 : 0)) * 100}%)` }} />
    <span className="appearance-switch-icon" data-active={!dark}><Sun size={19} aria-hidden="true" /></span>
    <span className="appearance-switch-icon" data-active={dark}><Moon size={19} aria-hidden="true" /></span>
  </button>
}
