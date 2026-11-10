import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request, brl as money } from '../api'
import CopyInvite from './CopyInvite'
import Master from '../rebuild/Admin'
import { GlisseButton } from '../rebuild/GlisseButton'
import { SegmentedControl, TabBar } from 'glisse'
import { HaloDropzone } from '../rebuild/vendor/cult-halo-dropzone'
import AnimatedTitle from '../rebuild/AnimatedTitle'
import { AnimatedField, DateField } from '../rebuild/Fields'
import { Building2, ClipboardCheck, ReceiptText, Users } from 'lucide-react'
import Tasks from './Tasks'
import MemberPicker from '../rebuild/MemberPicker'
import './republica.css'
import './motion.css'

const filters = ['Todas', 'Pendentes', 'Pagas'] as const
const pages = [
  { path: '/republica', label: 'Visão geral', icon: Building2 },
  { path: '/republica/despesas', label: 'Despesas', icon: ReceiptText },
  { path: '/republica/tarefas', label: 'Tarefas', icon: ClipboardCheck },
  { path: '/republica/moradores', label: 'Moradores', icon: Users },
] as const
type Filter = typeof filters[number]
type User = { id: string; nome: string; tipoUsuario: string; membro: { id: string } | null }
type House = { nome: string; codigoEntrada?: string; adminId: string }
type Dashboard = { totalPendente: string; totalPagoNoMes: string; tarefasAbertas: number }
type Member = { id: string; usuario: { id: string; nome: string } }
type Share = { id: string; membroId: string; valorDevido: string; valorPago: string }
type Expense = { id: string; titulo: string; categoria: string; valorTotal: string; vencimento: string; rateios: Share[] }
type Home = { user: User; house: House | null; dashboard: Dashboard | null; members: Member[]; expenses: Expense[] }
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
  const [editing, setEditing] = useState<{ expense: Expense; share: Share } | null>(null)
  const [createHouse, setCreateHouse] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [receiptRevision, setReceiptRevision] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const paymentKey = useRef('')
  const submitting = useRef(false)
  const page = pages.find(item => item.path === window.location.pathname.replace(/\/$/, '')) ?? pages[0]
  const overview = page.path === '/republica'
  const people = page.path === '/republica/moradores'
  const tasks = page.path === '/republica/tarefas'

  useEffect(() => {
    if (!token) { window.location.replace('/login'); return }
    let active = true
    async function load() {
      try {
        const user = await request<User>('/me', token)
        if (!active) return
        if (!user.membro || user.tipoUsuario === 'USUARIO_MASTER') {
          setHome({ user, house: null, dashboard: null, members: [], expenses: [] })
          setError('')
          return
        }
        const [house, dashboard, expenses, members] = await Promise.all([
          request<House>('/republicas/atual', token), request<Dashboard>('/dashboard', token),
          request<Expense[]>('/despesas', token), request<Member[]>('/membros', token),
        ])
        if (active) { setHome({ user, house, dashboard, expenses, members }); setError('') }
      } catch (err) {
        if (active && !expired(err)) setError((err as Error).message)
      } finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [token, revision])

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

  if (!home) return <div className="republica"><main className="rep-main rep-loading" aria-busy={loading}>
    <a className="rep-brand" href="/login">RepHouse</a>
    {error ? <><p role="alert">{error}</p><GlisseButton onClick={refresh}>Tentar novamente</GlisseButton><GlisseButton variant="secondary" disabled={busy} onClick={() => void logout()}>Sair</GlisseButton></> : <p role="status">Carregando sua república…</p>}
  </main></div>

  const { user, house, dashboard, members, expenses } = home
  if (user.tipoUsuario === 'USUARIO_MASTER') return <Master token={token} onLogout={logout} />
  if (window.location.pathname.replace(/\/$/, '') === '/admin') return <div className="republica">
    <main className="rep-main rep-onboarding">
      <section className="rep-intro"><div><AnimatedTitle>Área restrita</AnimatedTitle><p>Esta área exige uma conta de administrador master.</p></div></section>
      <GlisseButton href="/republica">Voltar à república</GlisseButton>
    </main>
  </div>
  if (!house || !dashboard) return <div className="republica"><main className="rep-main rep-onboarding">
    <header className="rep-top"><a className="rep-brand" href="/republica">RepHouse</a><GlisseButton variant="secondary" disabled={busy} onClick={() => void logout()}>Sair</GlisseButton></header>
    <section className="rep-intro"><div><AnimatedTitle>{'Oi, ' + user.nome.split(' ')[0] + '.'}</AnimatedTitle><p>Entre com um convite ou crie sua república.</p></div></section>
    <section className="rep-expenses"><SegmentedControl aria-label="Escolher república" value={createHouse ? 'criar' : 'entrar'} items={[
      { value: 'entrar', label: 'Tenho um convite' },
      { value: 'criar', label: 'Criar república' },
    ]} onValueChange={value => { if (!busy && !loading) { setCreateHouse(value === 'criar'); setError('') } }} />
    <form className="rep-house-form" key={String(createHouse)} onSubmit={enterHouse}>
      {createHouse ? <AnimatedField label="Nome da república" name="nome" required maxLength={120} /> : <AnimatedField label="Código de entrada" name="codigoEntrada" required pattern="[A-Za-z0-9]{6,32}" autoCapitalize="characters" autoComplete="off" />}
      {error && <p role="alert">{error}</p>}
      <GlisseButton type="submit" disabled={busy || loading}>{busy || loading ? 'Aguarde…' : createHouse ? 'Criar república' : 'Entrar na república'}</GlisseButton>
    </form></section>
  </main></div>

  const canCreate = user.tipoUsuario === 'USUARIO_ADMIN' && house.adminId === user.id
  const role = house.adminId === user.id ? 'Administrador' : 'Morador'
  const shares = expenses.flatMap(expense => expense.rateios.filter(share => share.membroId === user.membro?.id))
  const pending = shares.reduce((total, share) => total + remaining(share), 0)
  const paid = (expense: Expense) => expense.rateios.every(share => remaining(share) === 0)
  const visible = expenses.filter(expense => filter === 'Todas' || paid(expense) === (filter === 'Pagas'))
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())

  return <div className="republica">
    <aside className="rep-sidebar">
      <a className="rep-brand" href="/republica"><span aria-hidden="true">⌂</span> RepHouse</a>
      <div className="rep-house"><span>Minha república</span><strong>{house.nome}</strong></div>
      <nav aria-label="Navegação da casa">{pages.map(({ path, icon: Icon, label }) => <a key={path} href={path} aria-current={page.path === path ? 'page' : undefined}><Icon size={18} aria-hidden="true" /><span>{label}</span></a>)}</nav>
      <div className="rep-profile"><span className="rep-avatar">{initials(user.nome)}</span><div><strong>{user.nome}</strong><small>{role}</small></div></div>
    </aside>
    <div className="rep-glisse-dock">
      <TabBar aria-label="Navegação da casa" value={page.path} items={pages.map(({ path, icon: Icon, label }) => ({ value: path, href: path, label, icon: <Icon size={18} aria-hidden="true" /> }))} />
    </div>
    <main className="rep-main" aria-busy={loading}>
      <header className="rep-top"><span>{house.nome} <b> / </b> {page.label}</span><GlisseButton variant="secondary" disabled={busy} onClick={() => void logout()}>Sair</GlisseButton></header>
      {error && <div className="rep-error"><p role="alert">{error}</p><GlisseButton variant="secondary" disabled={loading} onClick={refresh}>Tentar novamente</GlisseButton></div>}
      {loading && <p role="status">Atualizando sua república…</p>}
      <section className="rep-intro" id="resumo">
        <div><p>{house.nome} · {month}</p><AnimatedTitle>{overview ? 'Oi, ' + user.nome.split(' ')[0] + '.' : page.label}</AnimatedTitle><p>{overview ? 'Veja o que já foi pago e o que falta acertar na casa.' : people ? 'Conheça os moradores da sua república.' : tasks ? 'Distribua os afazeres e acompanhe o que já foi feito.' : 'Acompanhe as contas da casa e registre seus pagamentos.'}</p></div>
        {!people && !tasks && canCreate && <GlisseButton disabled={busy || loading || Boolean(error)} onClick={() => open(null)}>＋ Nova despesa</GlisseButton>}
        {people && house.codigoEntrada && <CopyInvite code={house.codigoEntrada} />}
      </section>
      {overview && <>
        <div className="rep-overview">
          <section className="rep-balance"><p>Sua parte a pagar</p><strong>{money.format(pending / 100)}</strong><span>{shares.filter(share => remaining(share) > 0).length} rateios em aberto</span><svg className="rep-roof" viewBox="0 0 240 150" fill="none" aria-hidden="true"><path d="M8 148 94 66l85 82M50 148l86-82 86 82M92 148l86-82 61 58M128 148V97m45 51v-34" stroke="currentColor" strokeWidth="2" /></svg></section>
          <section className="rep-members" id="moradores"><h2>Quem mora aqui</h2><div className="rep-avatars" aria-label={members.map(member => member.usuario.nome).join(', ')}>{members.slice(0, 5).map(member => <span className="rep-avatar" key={member.id} title={member.usuario.nome}>{initials(member.usuario.nome)}</span>)}</div><p>{members.length} moradores</p>{house.codigoEntrada && <CopyInvite code={house.codigoEntrada} />}</section>
        </div>
        <div className="rep-summary" aria-label="Resumo da casa"><p>Em aberto na casa <strong>{money.format(Number(dashboard.totalPendente))}</strong></p><p>Pago neste mês <strong>{money.format(Number(dashboard.totalPagoNoMes))}</strong></p><p><a className="rep-task-link" href="/republica/tarefas">Tarefas abertas <strong>{dashboard.tarefasAbertas}</strong></a></p></div>
      </>}
      {tasks ? <Tasks token={token} members={members} memberId={user.membro?.id} canManage={canCreate} onExpired={expired} /> : people ? <section className="rep-expenses" aria-labelledby="residents-title">
        <div className="rep-section-head"><h2 id="residents-title">Pessoas da casa</h2><span className="rep-demo">{members.length} moradores</span></div>
        <ul>{members.map(member => <li key={member.id} className="rh-row-enter"><div className="rep-expense-name"><div className="rep-avatar">{initials(member.usuario.nome)}</div><strong>{member.usuario.nome}</strong></div><span className="rep-role">{member.usuario.id === house.adminId ? 'Administrador' : 'Morador'}</span></li>)}</ul>
      </section> : <section className="rep-expenses" id="despesas">
        <div className="rep-section-head"><h2>{overview ? 'Atividade da casa' : 'Todas as despesas'}</h2><SegmentedControl aria-label="Filtrar despesas da casa" value={filter} items={filters.map(value => ({ value, label: value }))} onValueChange={value => setFilter(value as Filter)} /></div>
        {visible.length === 0 ? <p className="rep-empty">{expenses.length ? 'Nenhuma despesa neste filtro.' : 'Nenhuma despesa cadastrada na casa.'}</p> : <ul>{visible.map(expense => {
          const share = expense.rateios.find(item => item.membroId === user.membro?.id)
          return <li className="rh-row-enter" key={expense.id}>
            <div className="rep-expense-name"><span aria-hidden="true">↗</span><div><strong>{expense.titulo}</strong><small>{expense.categoria} · {expense.vencimento.slice(0, 10).split('-').reverse().join('/')}</small></div></div>
            <div className="rep-amount"><strong>{money.format(Number(expense.valorTotal))}</strong><small>{share ? 'Seu saldo: ' + money.format(remaining(share) / 100) : 'Fora do seu rateio'}</small></div>
            {share && remaining(share) > 0 ? <GlisseButton variant="secondary" disabled={busy || loading || Boolean(error)} onClick={() => open(expense, share)}>Pagar</GlisseButton> : <span className="rep-paid">{paid(expense) ? 'Paga' : share ? 'Sua parte paga' : 'Pendente'}</span>}
          </li>
        })}</ul>}
      </section>}
      <div className="rep-status" role="status">{notice && <div className="rh-toast">{notice}<button aria-label="Fechar aviso" onClick={() => setNotice('')}>×</button></div>}</div>
    </main>
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
