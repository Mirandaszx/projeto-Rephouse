import { useState } from 'react'
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import './design-system.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'regular' | 'large'
}

export function Button({ variant = 'primary', size = 'regular', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className="rh-button" data-variant={variant} data-size={size} {...props} />
}

export function Badge({ tone = 'mint', children }: PropsWithChildren<{ tone?: 'mint' | 'warm' }>) {
  return <span className="rh-pill" data-tone={tone}>{children}</span>
}

export default function DesignSystem() {
  const [view, setView] = useState<'resumo' | 'atividade'>('resumo')
  const [message, setMessage] = useState('')
  return <div className="rh-studio">
    <nav className="rh-rail" aria-label="Design system"><strong>RepHouse</strong><a href="#fundamentos">Fundamentos</a><a href="#componentes">Componentes</a><a href="/">Voltar ao app</a></nav>
    <main className="rh-content">
      <header id="fundamentos"><span className="rh-eyebrow">RepHouse / Biblioteca visual</span><h1>Design system</h1><p>Componentes para organizar as contas da casa. Prévia com dados de exemplo.</p></header>
      <div className="rh-grid" id="componentes">
        <section className="rh-card"><h2>Paleta</h2><div className="rh-row">{[['Marca','brand'],['Verde','mint'],['Azul','blue'],['Destaque','warm']].map(([label, token]) => <span className="rh-swatch" key={token} style={{background: 'var(--rh-' + token + ')', color: token === 'brand' ? '#fff' : undefined}}>{label}</span>)}</div><p>Nura e Neulis são referências tipográficas. A prévia usa a fonte do sistema quando elas não estão instaladas.</p></section>
        <section className="rh-card"><h2>Botões</h2><div className="rh-row"><Button size="large" onClick={() => setMessage('Nova despesa selecionada.')}>Nova despesa</Button><Button variant="secondary" onClick={() => setMessage('Pagamento selecionado.')}>Pagar</Button><Button variant="ghost" onClick={() => setMessage('Ação cancelada.')}>Cancelar</Button><Button disabled>Indisponível</Button></div><p className="rh-feedback" role="status">{message}</p></section>
        <section className="rh-card"><h2>Campos</h2><label className="rh-field">Descrição<input placeholder="Ex.: Conta de luz" /></label><label className="rh-field">Valor em reais<input inputMode="decimal" placeholder="0,00" /></label><label><input type="checkbox" /> Dividir entre moradores</label></section>
        <section className="rh-card"><h2>Cartão de saldo</h2><div className="rh-row" role="group" aria-label="Visualização do cartão"><Button variant={view === 'resumo' ? 'secondary' : 'ghost'} aria-pressed={view === 'resumo'} onClick={() => setView('resumo')}>Resumo</Button><Button variant={view === 'atividade' ? 'secondary' : 'ghost'} aria-pressed={view === 'atividade'} onClick={() => setView('atividade')}>Atividade</Button></div>{view === 'resumo' ? <><p>Seu saldo</p><div className="rh-balance">R$ 84,50</div><Badge tone="warm">A pagar</Badge></> : <p>Conta de luz adicionada <Badge>Rateada</Badge></p>}</section>
      </div>
    </main>
  </div>
}
