import { LogOut, Settings, UserRound, Wallet } from 'lucide-react'
import type { Account, House } from '../../gestao/types'
import { WorkspaceBrand } from '../../interno/WorkspaceUI'
import { pages } from './navigation'
import PhotoAvatar from '../../perfil/PhotoAvatar'

type Props = { user: Account; house: House; token: string; activePath: string; role: string; busy: boolean; onLogout: () => Promise<void> }

export default function RepublicNavigation({ user, house, token, activePath, role, busy, onLogout }: Props) {
  return <>
    <aside className="rep-sidebar">
      <WorkspaceBrand />
      <div className="rep-house"><span>Minha república</span><strong>{house.nome}</strong></div>
      <div><p className="workspace-nav-label">A casa</p><nav aria-label="Navegação da casa">{pages.map(({ path, icon: Icon, label }) => <a key={path} href={path} aria-current={activePath === path ? 'page' : undefined}><Icon size={18} aria-hidden="true" /><span>{label}</span></a>)}</nav></div>
      <div className="rep-account"><div className="rep-profile"><PhotoAvatar name={user.nome} userId={user.id} photo={user.foto} token={token} context={house.id} className="rep-avatar" /><div><strong>{user.nome}</strong><small>{role}</small></div></div><div className="rep-account-links"><a href="/republica/perfil" aria-current={activePath === '/republica/perfil' ? 'page' : undefined}><UserRound size={16} />Meu perfil</a><a href="/republica/financeiro" aria-current={activePath === '/republica/financeiro' ? 'page' : undefined}><Wallet size={16} />Meu financeiro</a><a href="/republica/configuracoes" aria-current={activePath === '/republica/configuracoes' ? 'page' : undefined}><Settings size={16} />Configurações da república</a></div><button className="rep-logout" disabled={busy} onClick={() => void onLogout()}><LogOut size={17} aria-hidden="true" />Sair</button></div>
    </aside>
    <div className="rep-glisse-dock">
      <nav className="rep-mobile-nav" aria-label="Navegação da casa">{pages.map(({ path, icon: Icon, label }) => <a key={path} href={path} aria-current={activePath === path ? 'page' : undefined}><Icon size={19} aria-hidden="true" /><span>{label}</span></a>)}</nav>
    </div>
  </>
}
