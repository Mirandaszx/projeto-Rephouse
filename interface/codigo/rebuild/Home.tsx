import { useState } from 'react'
import { SegmentedControl } from 'glisse'
import { ArrowDown, ArrowRight, Check, ChevronDown, Coffee, House, LayoutDashboard, ListChecks, Menu, Pause, Play, ReceiptText, ShieldCheck, Sparkles, UsersRound, Wallet, Wifi, X } from 'lucide-react'
import { GlisseButton } from './GlisseButton'
import { TiltCard } from './spell/tilt-card'
import { BlurReveal } from './spell/blur-reveal'
import AnimatedGradient from './spell/animated-gradient'
import './home.css'

const gradient = { preset: 'custom' as const, color1: '#e1ece5', color2: '#d3e8f0', color3: '#f5e8ca', speed: 6, swirl: 30, swirlIterations: 3, scale: 0.4, softness: 100 }
const questions = [
  ['O que posso organizar no RepHouse?', 'As despesas compartilhadas, o rateio entre moradores, os registros de pagamento e as tarefas da casa. Cada pessoa pode acompanhar suas responsabilidades e seu histórico.'],
  ['O RepHouse faz pagamentos ou transferências?', 'Não. O RepHouse organiza os registros de pagamentos e comprovantes. A transferência do dinheiro continua sendo feita pelo meio combinado entre os moradores.'],
  ['Quem pode administrar a república?', 'A pessoa com perfil de administrador da república gerencia a casa e seus moradores. Cada perfil tem acesso às ações permitidas para ele.'],
  ['Já tenho uma conta. Como entro na minha casa?', 'Use Entrar no menu para acessar sua conta. Depois do login, você encontra as repúblicas às quais pertence e pode acompanhar o que está acontecendo na casa.'],
]

function HousePreview() {
  const [tab, setTab] = useState<'despesas' | 'tarefas'>('despesas')
  return <div className="rh-preview-wrap">
    <div className="rh-preview-note"><Sparkles size={14} /> Uma casa, tudo no lugar.</div>
    <TiltCard className="rh-preview" tiltLimit={3} scale={1.005} spotlight={false}>
      <div className="rh-preview-top"><span className="rh-preview-brand"><img src="/rephouse.svg" alt="" />RepHouse</span><span className="rh-example">Exemplo ilustrativo</span></div>
      <div className="rh-preview-content">
        <div className="rh-preview-greeting"><div><span>Sua república</span><h2>Nosso cantinho <span aria-hidden="true">☀</span></h2></div><span className="rh-house-avatar"><House size={23} /></span></div>
        <div className="rh-preview-balance"><span>Despesas compartilhadas</span><strong>R$ 1.200<span>,00</span></strong><div><span><i /> R$ 900,00 registrados</span><span>R$ 300,00 pendentes</span></div><div className="rh-balance-track"><span /></div></div>
        <SegmentedControl className="rh-preview-segments" aria-label="Exemplo da organização da casa" items={[{ value: 'despesas', label: <span><ReceiptText size={14} />Despesas</span> }, { value: 'tarefas', label: <span><ListChecks size={14} />Tarefas</span> }]} value={tab} onValueChange={value => setTab(value as 'despesas' | 'tarefas')} />
        <div className="rh-preview-list" aria-live="polite" aria-label={tab === 'despesas' ? 'Exemplo de despesas' : 'Exemplo de tarefas'}>
          {tab === 'despesas' ? <><div><span className="rh-item-icon blue"><Wifi size={18} /></span><span><strong>Internet</strong><small>Dividida entre moradores</small></span><span className="rh-list-value">R$ 120,00<small>Registrado <Check size={12} /></small></span></div><div><span className="rh-item-icon orange"><Coffee size={18} /></span><span><strong>Compras da casa</strong><small>Itens de uso comum</small></span><span className="rh-list-value">R$ 280,00<small className="pending">Pendente</small></span></div></> : <><div><span className="rh-task-check"><Check size={15} /></span><span><strong>Cuidar da cozinha</strong><small>Responsável: Ana · exemplo</small></span><span className="rh-task-status">Concluída</span></div><div><span className="rh-task-check empty" /><span><strong>Organizar a sala</strong><small>Responsável: você · exemplo</small></span><span className="rh-task-status pending">Pendente</span></div></>}
        </div>
        <div className="rh-preview-bottom"><span className="rh-avatar-stack" aria-hidden="true"><i>A</i><i>B</i><i>C</i><i>V</i></span><span>Todo mundo na mesma página.</span><UsersRound size={17} /></div>
      </div>
    </TiltCard>
    <div className="rh-floating-note"><span><Check size={18} /></span><div><strong>Combinado é combinado.</strong><small>Mais clareza para dividir a casa.</small></div></div>
  </div>
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  return <div className="rh-home">
    <a className="rh-skip" href="#conteudo">Ir para o conteúdo</a>
    <header className="rh-header"><div className="rh-container rh-header-inner">
      <a className="rh-brand" href="/" aria-label="RepHouse, início"><img src="/rephouse.svg" alt="" /><span>RepHouse<span className="rh-brand-dot">.</span></span></a>
      <nav className="rh-desktop-nav" aria-label="Navegação principal"><a href="#recursos">O que tem por aqui</a><a href="#como-funciona">Como funciona</a><a href="#duvidas">Dúvidas</a></nav>
      <div className="rh-header-actions"><a className="rh-login" href="/login">Entrar</a><GlisseButton href="/cadastro" className="rh-nav-cta">Criar conta <ArrowRight size={16} /></GlisseButton><button className="rh-menu-button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="rh-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
    </div>{menuOpen && <nav id="rh-mobile-nav" className="rh-mobile-nav" aria-label="Navegação móvel" onClick={() => setMenuOpen(false)}><a href="#recursos">O que tem por aqui</a><a href="#como-funciona">Como funciona</a><a href="#duvidas">Dúvidas</a><a href="/cadastro">Criar minha conta</a></nav>}</header>
    <main id="conteudo">
      <section className="rh-hero rh-container" aria-label="Apresentação do RepHouse">
        <div className="rh-hero-copy"><span className="rh-hero-label"><span /> A vida em república, bem resolvida.</span><BlurReveal as="h1" className="rh-hero-title" speedReveal={3} speedSegment={0.8}>Dividir a casa pode ser mais leve.</BlurReveal><p id="hero-title">As contas, as tarefas e os combinados em um só lugar. Para sobrar mais tempo para o melhor de morar junto.</p><div className="rh-hero-actions"><GlisseButton href="/cadastro">Organizar minha república <ArrowRight size={18} /></GlisseButton><a href="#como-funciona" className="rh-text-link">Conhecer o RepHouse <ArrowDown size={16} /></a></div><div className="rh-hero-reassurance"><ShieldCheck size={17} /><span>Cada um sabe sua parte. A casa segue em frente.</span></div></div>
        <div className="rh-hero-stage"><div className="rh-gradient-stage" aria-hidden="true"><AnimatedGradient config={gradient} paused={paused} style={{ zIndex: 0 }} /></div><HousePreview /><button className="rh-motion-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? 'Retomar animação de fundo' : 'Pausar animação de fundo'}>{paused ? <Play size={13} /> : <Pause size={13} />}<span>{paused ? 'Retomar animação' : 'Pausar animação'}</span></button></div>
      </section>
      <div className="rh-promise-strip"><div className="rh-container"><span><ReceiptText />Contas sem confusão</span><span><UsersRound />Responsabilidades claras</span><span><ListChecks />Uma rotina compartilhada</span></div></div>
      <section className="rh-features rh-container" id="recursos" aria-labelledby="features-title"><div className="rh-section-heading"><div><span className="rh-section-label">A casa funciona melhor junto</span><h2 id="features-title">Menos “quem ficou de fazer?”.<br />Mais vida acontecendo.</h2></div><p>Um espaço para organizar o que é de todos, sem perder de vista o que é de cada um.</p></div>
        <div className="rh-features-grid">
          <article className="rh-feature-finance"><div className="rh-feature-icon"><Wallet size={25} /></div><h3>Dividir as contas.<br />Sem dividir a cabeça.</h3><p>Registre despesas, organize os rateios e acompanhe os pagamentos da casa. Tudo com um histórico para consultar depois.</p><div className="rh-split-visual" aria-label="Ilustração: uma despesa compartilhada entre quatro moradores"><span className="rh-split-total"><ReceiptText size={18} />Uma despesa da casa</span><div className="rh-split-connectors" aria-hidden="true" /><div className="rh-split-people"><span><i>A</i>Ana</span><span><i>B</i>Bia</span><span><i>C</i>Caio</span><span><i>V</i>Você</span></div><small>Exemplo de rateio entre moradores</small></div></article>
          <article className="rh-feature-tasks"><div className="rh-feature-icon"><ListChecks size={25} /></div><h3>A rotina não precisa<br />ficar nas costas de um.</h3><p>Distribua tarefas e acompanhe o que já foi feito. Os combinados ficam visíveis para toda a casa.</p><div className="rh-task-visual" aria-hidden="true"><div><span className="rh-task-check"><Check size={15} /></span><span>Cozinha em ordem</span><span className="rh-mini-avatar">A</span></div><div><span className="rh-task-check empty" /><span>Cuidar das áreas comuns</span><span className="rh-mini-avatar blue">V</span></div></div></article>
          <article className="rh-feature-people"><div className="rh-feature-icon"><UsersRound size={25} /></div><div><h3>Cada morador tem seu lugar.</h3><p>Acompanhe seus registros, encontre as informações da república e saiba o que depende de você.</p></div><div className="rh-people-art" aria-hidden="true"><span>A</span><span>B</span><span>Você</span></div></article>
        </div>
      </section>
      <section className="rh-how" id="como-funciona" aria-labelledby="how-title"><div className="rh-container rh-how-inner"><div className="rh-how-intro"><span className="rh-section-label">Do primeiro acesso à rotina</span><h2 id="how-title">Dê um novo ritmo<br />à sua república.</h2><p>Comece pela sua conta. Depois, traga a organização para dentro de casa.</p><GlisseButton href="/cadastro">Começar agora <ArrowRight size={17} /></GlisseButton></div><ol className="rh-steps"><li><span className="rh-step-number">1</span><div><h3>Crie seu espaço</h3><p>Cadastre sua conta e acesse a república da qual você faz parte.</p></div><House size={24} /></li><li><span className="rh-step-number">2</span><div><h3>Coloque os combinados em dia</h3><p>Organize as despesas e as tarefas com as pessoas que dividem a casa com você.</p></div><ReceiptText size={24} /></li><li><span className="rh-step-number">3</span><div><h3>Acompanhe a vida da casa</h3><p>Veja o que está pendente, registre pagamentos e acompanhe suas responsabilidades.</p></div><LayoutDashboard size={24} /></li></ol></div></section>
      <section className="rh-faq rh-container" id="duvidas" aria-labelledby="faq-title"><div><span className="rh-section-label">Antes de entrar</span><h2 id="faq-title">Bom saber.</h2><p>Algumas respostas para começar com tudo claro.</p></div><div className="rh-faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19} /></summary><p>{answer}</p></details>)}</div></section>
      <section className="rh-closing rh-container"><div className="rh-closing-inner"><div><span className="rh-section-label">Sua casa. Sua turma. Tudo mais simples.</span><h2>O próximo combinado:<br />organizar a casa juntos.</h2><GlisseButton href="/cadastro" className="rh-closing-button">Criar minha conta <ArrowRight size={18} /></GlisseButton></div><div className="rh-closing-house" aria-hidden="true"><House strokeWidth={1} /><span><Check size={30} /></span></div></div></section>
    </main>
    <footer className="rh-footer rh-container"><div><a className="rh-brand" href="/"><img src="/rephouse.svg" alt="" /><span>RepHouse<span className="rh-brand-dot">.</span></span></a><p>Para dividir a casa e somar na convivência.</p></div><nav aria-label="Links do rodapé"><a href="/login">Entrar</a><a href="/cadastro">Criar conta</a><a href="/admin">Administração</a></nav><small>RepHouse · Organização para morar junto.</small></footer>
  </div>
}
