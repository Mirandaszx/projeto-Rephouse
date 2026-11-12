import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request, brl as money } from '../api'
import CopyInvite from './CopyInvite'
import Master from '../rebuild/Admin'
import { GlisseButton } from '../rebuild/GlisseButton'
import { SegmentedControl } from 'glisse'
import { HaloDropzone } from '../rebuild/vendor/cult-halo-dropzone'
import { AnimatedField, DateField } from '../rebuild/Fields'
import { Building2, ClipboardCheck, LogOut, ReceiptText, Users, UserRoundPlus, Settings, UserRound, Wallet, House as HouseIcon, KeyRound } from 'lucide-react'
import Tasks from './Tasks'
import Overview, { type Expense, type Share } from './Overview'
import AppearanceControl from '../aparencia/AppearanceControl'
import MemberPicker from '../rebuild/MemberPicker'
import Profile from '../gestao/Profile'
import PersonalFinance from '../gestao/PersonalFinance'
import HouseSettings from '../gestao/HouseSettings'
import Residents from '../gestao/Residents'
import ExpenseDetails from '../gestao/ExpenseDetails'
import type { Account, House, Member } from '../gestao/types'
import './republica.css'
import './motion.css'
import { Badge, EmptyState, PageHeading, SectionHeading, WorkspaceBrand } from '../interno/WorkspaceUI'
import { financialState } from '../interno/presentation'
import { useWorkspaceTransition } from '../interno/useWorkspaceTransition'
import { useWorkspaceNavigation } from '../interno/useWorkspaceNavigation'
import { WorkspacePage } from '../interno/WorkspacePage'
import '../interno/workspace.css'

const filters = ['Todas', 'Pendentes', 'Pagas'] as const
const pages = [
  { path: '/republica', label: 'Visão geral', icon: Building2 },
  { path: '/republica/despesas', label: 'Despesas', icon: ReceiptText },
  { path: '/republica/tarefas', label: 'Tarefas', icon: ClipboardCheck },
  { path: '/republica/moradores', label: 'Moradores', icon: Users },
] as const
type Filter = typeof filters[number]
type Dashboard = { totalPendente: string; totalPagoNoMes: string; tarefasAbertas: number }
type Home = { path: string; user: Account; house: House | null; dashboard: Dashboard | null; members: Member[]; expenses: Expense[] }
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
const remaining = (share: Share) => Math.max(0, Math.round(Number(share.valorDevido) * 100) - Math.round(Number(share.valorPago) * 100))

function expired(err: unknown) {
  if ((err as { status?: number }).status !== 401) return false
  sessionStorage.removeItem('rephouse-token')
  window.location.replace('/login')
  return true
}

export default function Republica() {
  const [token] = useState(() => sessionStorage.getItem('rephouse-token') || '')
  const [home, setHome] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [filter, setFilter] = useState<Filter>('Todas')
  const results = useWorkspaceTransition(filter)
  const [editing, setEditing] = useState<{ expense: Expense; share: Share } | null>(null)
  const [createHouse, setCreateHouse] = useState(() => new URLSearchParams(window.location.search).get('acao') === 'criar')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [receiptRevision, setReceiptRevision] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const paymentKey = useRef('')
  const submitting = useRef(false)
  const navigation = useWorkspaceNavigation()
  const currentPath = navigation.path
  const profile = currentPath === '/republica/perfil'
  const personal = currentPath === '/republica/financeiro'
  const settings = currentPath === '/republica/configuracoes'
  const accountRoute = profile || personal
  const page = settings ? { path: currentPath, label: 'Configurações da república' } : pages.find(item => item.path === currentPath) ?? pages[0]
  const overview = page.path === '/republica'
  const people = page.path === '/republica/moradores'
  const tasks = page.path === '/republica/tarefas'

  useEffect(() => {
    if (!token) { window.location.replace('/login'); return }
    let active = true
    async function load() {
      try {
        const user = await request<Account>('/me', token)
        if (!active) return
        if (accountRoute || !user.membro || user.tipoUsuario === 'USUARIO_MASTER') {
          setHome({ path: currentPath, user, house: null, dashboard: null, members: [], expenses: [] })
          setError('')
          return
        }
        const [house, dashboard, expenses, members] = await Promise.all([
          request<House>('/republicas/atual', token), request<Dashboard>('/dashboard', token),
          request<Expense[]>('/despesas', token), request<Member[]>('/membros', token),
        ])
        if (active) { setHome({ path: currentPath, user, house, dashboard, expenses, members }); setError('') }
      } catch (err) {
        if (active && !expired(err)) setError((err as Error).message)
      } finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [token, revision, accountRoute, currentPath])

  function refresh() {
    setLoading(true)
    setError('')
    setRevision(value => value + 1)
  }

  function open(expense: Expense | null, share?: Share) {
    setEditing(expense && share ? { expense, share } : null)
    setReceipt(null)
    setReceiptRevision(value => value + 1)
    setFormError('')
    paymentKey.current = crypto.randomUUID()
    dialog.current?.querySelector('form')?.reset()
    dialog.current?.showModal()
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setFormError('')
    try {
      if (editing) {
        if (receipt) data.set('comprovante', receipt)
        data.set('rateioId', editing.share.id)
        await request('/pagamentos', token, data, { 'Idempotency-Key': paymentKey.current })
        setNotice('Pagamento registrado.')
      } else {
        const membroIds = data.getAll('membroIds')
        if (!membroIds.length) throw new Error('Selecione pelo menos um morador para o rateio.')
        await request('/despesas', token, {
          titulo: data.get('titulo'), categoria: data.get('categoria'), valorTotal: data.get('valorTotal'),
          vencimento: data.get('vencimento'), membroIds,
        })
        setFilter('Todas')
        setNotice('Despesa cadastrada com rateio.')
      }
      dialog.current?.close()
      refresh()
    } catch (err) { if (!expired(err)) setFormError((err as Error).message) }
    finally { setBusy(false); submitting.current = false }
  }

  async function enterHouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await request(createHouse ? '/republicas' : '/republicas/entrar', token, createHouse
        ? { nome: String(data.get('nome')).trim() }
        : { codigoEntrada: String(data.get('codigoEntrada')).trim().toUpperCase() })
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.delete('acao')
      window.history.replaceState(null, '', currentUrl.pathname + currentUrl.search + currentUrl.hash)
      refresh()
    } catch (err) { if (!expired(err)) setError((err as Error).message) }
    finally { setBusy(false); submitting.current = false }
  }

  async function logout() {
    setBusy(true)
    setError('')
    try {
      await request('/auth/logout', token, {})
      sessionStorage.removeItem('rephouse-token')
      window.location.replace('/login')
    } catch (err) { if (!expired(err)) setError((err as Error).message) }
    finally { setBusy(false) }
  }

  const routePending = Boolean(home && home.path !== currentPath)
  if (!home || (routePending && !home.house && !accountRoute)) return <div className="republica rep-internal"><main className="rep-main rep-loading" aria-busy={loading || (routePending && !error)}>
    <WorkspaceBrand href="/login" />
    {error ? <><p role="alert">{error}</p><GlisseButton onClick={refresh}>Tentar novamente</GlisseButton><GlisseButton variant="secondary" disabled={busy} onClick={() => void logout()}>Sair</GlisseButton></> : <p role="status">Carregando sua república…</p>}
  </main></div>

  const { user, house, dashboard, members, expenses } = home
  if (accountRoute) return <div className="republica rep-internal rep-account-shell"><main className="rep-main" tabIndex={-1}>
    <header className="rep-account-header"><WorkspaceBrand /><nav aria-label="Sua conta"><a href="/republica">Voltar à república</a><a href="/republica/perfil" aria-current={profile ? 'page' : undefined}>Meu perfil</a><a href="/republica/financeiro" aria-current={personal ? 'page' : undefined}>Meu financeiro</a><AppearanceControl compact /><button className="rep-logout" disabled={busy} onClick={() => void logout()}>Sair</button></nav></header>
    {error && <div><p role="alert">{error}</p><GlisseButton variant="secondary" disabled={loading} onClick={refresh}>Tentar novamente</GlisseButton></div>}
    {routePending ? !error && <p role="status">Carregando sua conta…</p> : <WorkspacePage key={currentPath} animate={navigation.animate} focus={navigation.focus}>
    <PageHeading title={profile ? 'Meu perfil' : 'Meu financeiro'} context="Sua conta" description={profile ? 'Cuide dos seus dados e do acesso à conta.' : 'Seu histórico acompanha você em cada casa.'} />
    {profile ? <Profile account={user} token={token} onChanged={refresh} /> : <PersonalFinance token={token} currentHouseId={user.membro?.republicaId} />}
    </WorkspacePage>}
  </main></div>
  if (user.tipoUsuario === 'USUARIO_MASTER') return <Master token={token} onLogout={logout} />
  if (currentPath === '/admin') return <div className="republica rep-internal">
    <main className="rep-main rep-onboarding">
      <PageHeading title="Área restrita" description="Esta área exige uma conta de administrador master." />
      <GlisseButton href="/republica">Voltar à república</GlisseButton>
    </main>
  </div>
  if (!house || !dashboard) return <div className="republica rep-internal"><main className="rep-main rep-onboarding">
    <header className="rep-top"><WorkspaceBrand /><div className="rep-onboarding-actions"><a href="/republica/perfil">Meu perfil</a><a href="/republica/financeiro">Meu financeiro</a><AppearanceControl compact /><GlisseButton variant="secondary" disabled={busy} onClick={() => void logout()}>Sair</GlisseButton></div></header>
    <PageHeading title={'Oi, ' + user.nome.split(' ')[0] + '.'} context="Seu espaço no RepHouse" description={createHouse ? 'Dê um nome à sua república. Você receberá um código para convidar os moradores.' : 'Informe o código compartilhado por alguém da sua república ou crie uma nova.'} />
    <section className="rep-expenses workspace-onboarding-card"><span className="workspace-onboarding-symbol" aria-hidden="true">{createHouse ? <HouseIcon size={24} /> : <KeyRound size={24} />}</span><SegmentedControl aria-label="Escolher república" value={createHouse ? 'criar' : 'entrar'} items={[
      { value: 'entrar', label: 'Tenho um convite' },
      { value: 'criar', label: 'Criar república' },
    ]} onValueChange={value => { if (!busy && !loading) { setCreateHouse(value === 'criar'); setError('') } }} />
    <SectionHeading title={createHouse ? 'Uma casa para a sua turma' : 'Encontre a sua casa'} description={createHouse ? 'Você será o primeiro administrador da república.' : 'O código é compartilhado por um morador da república.'} />
    <form className="rep-house-form" key={String(createHouse)} onSubmit={enterHouse}>
      {createHouse ? <AnimatedField label="Nome da república" name="nome" required maxLength={120} /> : <AnimatedField label="Código de entrada" name="codigoEntrada" required pattern="[A-Za-z0-9]{6,32}" autoCapitalize="characters" autoComplete="off" />}
      {error && <p role="alert">{error}</p>}
      <GlisseButton type="submit" disabled={busy || loading}>{busy || loading ? 'Aguarde…' : createHouse ? 'Criar república' : 'Entrar na república'}</GlisseButton>
    </form></section>
  </main></div>

  const canCreate = user.tipoUsuario === 'USUARIO_ADMIN' && house.adminId === user.id
  const role = house.adminId === user.id ? 'Administrador' : 'Morador'
  const paid = (expense: Expense) => expense.rateios.every(share => remaining(share) === 0)
  const visible = expenses.filter(expense => filter === 'Todas' || paid(expense) === (filter === 'Pagas'))
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date())

  return <div className="republica rep-internal">
    <a className="workspace-skip" href="#conteudo-interno">Ir para o conteúdo</a>
    <aside className="rep-sidebar">
      <WorkspaceBrand />
      <div className="rep-house"><span>Minha república</span><strong>{house.nome}</strong></div>
      <div><p className="workspace-nav-label">A casa</p><nav aria-label="Navegação da casa">{pages.map(({ path, icon: Icon, label }) => <a key={path} href={path} aria-current={page.path === path ? 'page' : undefined}><Icon size={18} aria-hidden="true" /><span>{label}</span></a>)}</nav></div>
      <div className="rep-account"><div className="rep-profile"><span className="rep-avatar">{initials(user.nome)}</span><div><strong>{user.nome}</strong><small>{role}</small></div></div><div className="rep-account-links"><a href="/republica/perfil"><UserRound size={16} />Meu perfil</a><a href="/republica/financeiro"><Wallet size={16} />Meu financeiro</a><a href="/republica/configuracoes" aria-current={settings ? 'page' : undefined}><Settings size={16} />Configurações da república</a></div><AppearanceControl /><button className="rep-logout" disabled={busy} onClick={() => void logout()}><LogOut size={17} aria-hidden="true" />Sair</button></div>
    </aside>
    <div className="rep-glisse-dock">
      <nav className="rep-mobile-nav" aria-label="Navegação da casa">{pages.map(({ path, icon: Icon, label }) => <a key={path} href={path} aria-current={page.path === path ? 'page' : undefined}><Icon size={19} aria-hidden="true" /><span>{label}</span></a>)}</nav>
    </div>
    <main className="rep-main rep-workspace" id="conteudo-interno" tabIndex={-1} aria-busy={loading || (routePending && !error)}>
      <div className="rep-mobile-profile"><div className="rep-profile"><span className="rep-avatar">{initials(user.nome)}</span><div><strong>{user.nome}</strong><small>{role}</small></div></div><div className="rep-mobile-actions"><a className="rep-mobile-account-link" aria-label="Meu perfil" href="/republica/perfil"><UserRound size={18} /></a><a className="rep-mobile-account-link" aria-label="Meu financeiro" href="/republica/financeiro"><Wallet size={18} /></a><a className="rep-mobile-account-link" aria-label="Configurações da república" href="/republica/configuracoes"><Settings size={18} /></a><AppearanceControl compact /><button className="rep-logout" disabled={busy} onClick={() => void logout()}><LogOut size={17} aria-hidden="true" />Sair</button></div></div>
      {error && <div className="rep-error"><p role="alert">{error}</p><GlisseButton variant="secondary" disabled={loading} onClick={refresh}>Tentar novamente</GlisseButton></div>}
      {loading && !routePending && <p role="status">Atualizando sua república…</p>}
      {routePending ? !error && <p className="workspace-route-loading" role="status">Carregando página…</p> : <WorkspacePage key={currentPath} animate={navigation.animate} focus={navigation.focus}>
      <PageHeading context={house.nome + ' · ' + month} title={overview ? 'Oi, ' + user.nome.split(' ')[0] + '.' : page.label} description={overview ? 'Acompanhe as contas e as tarefas da república.' : people ? 'Conheça os moradores da sua república.' : tasks ? 'Distribua os afazeres e acompanhe o que já foi feito.' : settings ? 'Cuide dos dados, da administração e do seu vínculo com a casa.' : 'Acompanhe as contas da casa e registre seus pagamentos.'}>
        {!people && !tasks && !settings && canCreate && <GlisseButton disabled={busy || loading || Boolean(error)} onClick={() => open(null)}>＋ Nova despesa</GlisseButton>}
      </PageHeading>
      {settings ? <HouseSettings token={token} house={house} members={members} canManage={canCreate} onChanged={refresh} /> : overview ? <Overview token={token} revision={revision} memberId={user.membro?.id} members={members} expenses={expenses} dashboard={dashboard} disabled={busy || loading || Boolean(error)} onPay={open} onExpired={expired} /> : tasks ? <Tasks token={token} members={members} memberId={user.membro?.id} canManage={canCreate} onExpired={expired} /> : people ? <><Residents token={token} members={members} adminId={house.adminId} canManage={canCreate} onChanged={refresh} />{house.codigoEntrada && <section className="rep-invite" aria-labelledby="invite-title"><div><h2 id="invite-title"><UserRoundPlus size={19} aria-hidden="true" />Convide um morador</h2><p>Compartilhe o código com quem vai morar com você.</p></div><CopyInvite code={house.codigoEntrada} /></section>}</> : <section className="rep-expenses" id="despesas">
        <SectionHeading title="Todas as despesas" description={`${visible.length} ${visible.length === 1 ? 'registro' : 'registros'} neste filtro`}><SegmentedControl className="workspace-expense-filter" aria-label="Filtrar despesas da casa" value={filter} items={filters.map(value => ({ value, label: value }))} onValueChange={value => setFilter(value as Filter)} /></SectionHeading>
        <div ref={results} className="workspace-results">{visible.length === 0 ? <EmptyState title={expenses.length ? 'Nenhuma despesa neste filtro.' : 'Nenhuma despesa cadastrada na casa.'} /> : <><div className="workspace-expense-columns" aria-hidden="true"><span>Despesa</span><span>Vencimento</span><span>Valor e sua parte</span><span>Ação</span></div><ul>{visible.map(expense => {
          const share = expense.rateios.find(item => item.membroId === user.membro?.id)
          const state = financialState(expense.vencimento, expense.rateios.reduce((total, item) => total + remaining(item), 0), expense.rateios.reduce((total, item) => total + Number(item.valorPago), 0))
          return <li className="rh-row-enter" key={expense.id}>
            <div className="rep-expense-name"><span aria-hidden="true"><ReceiptText size={19} /></span><div><button type="button" className="rep-expense-detail-link" aria-label={`Detalhes de ${expense.titulo}`} onClick={() => setDetailId(expense.id)}>{expense.titulo}</button><small>{expense.categoria}</small></div></div>
            <div className="workspace-expense-due"><time dateTime={expense.vencimento.slice(0, 10)}>{expense.vencimento.slice(0, 10).split('-').reverse().join('/')}</time><Badge tone={state.tone}>{state.label}</Badge></div>
            <div className="rep-amount"><strong>{money.format(Number(expense.valorTotal))}</strong><small>{share ? 'Seu saldo: ' + money.format(remaining(share) / 100) : 'Fora do seu rateio'}</small></div>
            {share && remaining(share) > 0 ? <GlisseButton variant="secondary" disabled={busy || loading || Boolean(error)} onClick={() => open(expense, share)}>Pagar</GlisseButton> : <span className="rep-paid">{paid(expense) ? 'Paga' : share ? 'Sua parte paga' : 'Pendente'}</span>}
          </li>
        })}</ul></>}</div>
      </section>}
      </WorkspacePage>}
      <div className="rep-status" role="status">{notice && <div className="rh-toast">{notice}<button aria-label="Fechar aviso" onClick={() => setNotice('')}>×</button></div>}</div>
    </main>
    {detailId && <ExpenseDetails id={detailId} token={token} members={members} memberId={user.membro?.id} canManage={canCreate} onChanged={refresh} onClose={() => setDetailId(null)} />}
    <dialog ref={dialog} className="rep-dialog" aria-labelledby="rep-dialog-title" onCancel={event => { if (busy) event.preventDefault() }}>
      <form key={editing?.share.id ?? 'new-' + receiptRevision} onSubmit={save} onChange={() => { paymentKey.current = crypto.randomUUID() }}>
        <h2 id="rep-dialog-title">{editing ? 'Registrar pagamento' : 'Nova despesa'}</h2>
        <fieldset disabled={busy} className="rep-form-fields">
          {editing ? <><p>{editing.expense.titulo} · Saldo: {money.format(remaining(editing.share) / 100)}</p>
            <AnimatedField label="Valor pago (R$)" name="valor" type="number" required min="0.01" step="0.01" max={remaining(editing.share) / 100} defaultValue={(remaining(editing.share) / 100).toFixed(2)} />
            <div className="rep-receipt">
              <p>Comprovante opcional</p>
              <HaloDropzone key={receiptRevision} disabled={busy} accept=".pdf,.png,.jpg,.jpeg,.webp"
                emptyLabel="Solte o comprovante aqui ou escolha um arquivo" successLabel="Comprovante selecionado"
                formatHint="PDF, PNG, JPEG ou WebP · até 5 MB" successResetMs={0} showSuccessThumbnails={false}
                onFiles={files => {
                  const file = files[0]
                  if (files.length !== 1 || file.size === 0 || file.size > 5 * 1024 * 1024 || !/\.(pdf|png|jpe?g|webp)$/i.test(file.name)) {
                    setFormError('Selecione um PDF ou imagem válida de até 5 MB.')
                    return false
                  }
                  setReceipt(file)
                  setFormError('')
                  paymentKey.current = crypto.randomUUID()
                }} />
              {receipt && <div className="rep-receipt-selected"><span>{receipt.name}</span><GlisseButton variant="secondary" disabled={busy} onClick={() => {
                setReceipt(null)
                setReceiptRevision(value => value + 1)
                setFormError('')
                paymentKey.current = crypto.randomUUID()
              }}>Remover comprovante</GlisseButton></div>}
            </div>
          </> : <>
            <AnimatedField label="Descrição" name="titulo" required maxLength={160} />
            <AnimatedField label="Categoria" name="categoria" required maxLength={80} defaultValue="Contas da casa" />
            <AnimatedField label="Valor total da despesa (R$)" name="valorTotal" type="number" required min="0.01" max="9999999999.99" step="0.01" />
            <DateField label="Vencimento" name="vencimento" required />
            <MemberPicker members={members} />
          </>}
        </fieldset>
        {formError && <p role="alert">{formError}</p>}
        <footer><GlisseButton variant="secondary" disabled={busy} onClick={() => dialog.current?.close()}>Cancelar</GlisseButton><GlisseButton type="submit" disabled={busy}>{busy ? 'Salvando…' : editing ? 'Registrar' : 'Adicionar'}</GlisseButton></footer>
      </form>
    </dialog>
  </div>
}
