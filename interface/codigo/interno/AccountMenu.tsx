import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { LogOut, Settings, UserRound, Wallet } from 'lucide-react'

type Props = { avatar: ReactNode; name: string; role: string; busy: boolean; onLogout: () => void; children?: ReactNode }

/**
 * Menu da conta no celular: um único avatar no topo reúne perfil, financeiro, configurações e saída.
 * Disclosure simples (botão + aria-expanded): fecha com Esc (devolvendo o foco), clique fora ou ao navegar.
 */
export function AccountMenu({ avatar, name, role, busy, onLogout, children }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key) }
  }, [open])
  const close = () => setOpen(false)
  return <div className="account-menu" ref={root}>
    <button ref={trigger} type="button" className="account-menu-trigger" aria-expanded={open} aria-controls={panelId}
      aria-label={`Abrir menu da conta de ${name}`} onClick={() => setOpen(value => !value)}>{avatar}</button>
    {open && <div id={panelId} className="account-menu-panel">
      <p className="account-menu-who"><strong>{name}</strong><small>{role}</small></p>
      <nav aria-label="Sua conta">
        <a href="/republica/perfil" onClick={close}><UserRound size={18} aria-hidden="true" />Meu perfil</a>
        <a href="/republica/financeiro" onClick={close}><Wallet size={18} aria-hidden="true" />Meu financeiro</a>
        <a href="/republica/configuracoes" onClick={close}><Settings size={18} aria-hidden="true" />Configurações da república</a>
      </nav>
      {children}
      <button type="button" className="account-menu-logout" disabled={busy} onClick={onLogout}><LogOut size={18} aria-hidden="true" />Sair</button>
    </div>}
  </div>
}
