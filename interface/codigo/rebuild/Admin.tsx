import { useEffect, useState } from 'react'
import type { ComponentProps } from 'react'
import { TabBar } from 'glisse'
import { ArrowUpRight, Building2, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardList, LayoutGrid, LogOut, PanelLeft, Search, ShieldCheck, Users, Wallet } from 'lucide-react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { brl, request } from '../api'
import AppearanceControl from '../aparencia/AppearanceControl'
import { GlisseButton } from './GlisseButton'
import FilterCombobox from './FilterCombobox'
import AnimatedTitle from './AnimatedTitle'
import FinanceChart from './FinanceChart'
import type { FinancePoint } from './FinanceChart'
import { cn } from './vendor/cn'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './vendor/shadcn-table'
import './admin.css'

type Summary = { usuarios: number; republicas: number; totalPendente: string; tarefasAbertas: number; historicoIlustrativo?: FinancePoint[] }
type House = { id: string; nome: string; ativa: boolean }
type User = { id: string; nome: string; email: string; ativo: boolean }
type RecordRow = { id: string; name: string; email?: string; active: boolean }
const directoryColumns: ColumnDef<RecordRow>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'active', header: 'Status' },
]
const tabs = [
  { value: 'resumo', label: 'Visão geral', icon: LayoutGrid },
  { value: 'republicas', label: 'Repúblicas', icon: Building2 },
  { value: 'usuarios', label: 'Usuários', icon: Users },
] as const
type Tab = typeof tabs[number]['value']

// Dashboard 01, shadcn/ui (MIT): real Card primitives and SectionCards composition,
// ported from apps/v4/registry/new-york-v4/{ui/card.tsx,blocks/dashboard-01/components/section-cards.tsx}.
// Source: https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/blocks/dashboard-01
// Local adaptations: RepHouse CSS tokens, real API totals, Glisse controls; no sample growth claims.
function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card" className={cn('flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm', className)} {...props} />
}
function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]', className)} {...props} />
}
function CardTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-title" className={cn('leading-none font-semibold', className)} {...props} />
}
function CardDescription({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
}
function CardAction({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-action" className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)} {...props} />
}
function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('flex items-center px-6', className)} {...props} />
}
function SectionCards({ summary, houses, users }: { summary: Summary; houses: House[]; users: User[] }) {
  const activeHouses = houses.filter(house => house.ativa).length
  const activeUsers = users.filter(user => user.ativo).length
  const metrics = [
    { label: 'Repúblicas cadastradas', value: summary.republicas.toLocaleString('pt-BR'), icon: Building2, detail: `${activeHouses} ativas`, note: `${houses.length - activeHouses} inativas entre os registros consultados`, tone: 'green' },
    { label: 'Usuários cadastrados', value: summary.usuarios.toLocaleString('pt-BR'), icon: Users, detail: `${activeUsers} contas ativas`, note: `${users.length - activeUsers} inativas entre os registros consultados`, tone: 'blue' },
    { label: 'Rateios em aberto', value: brl.format(Number(summary.totalPendente)), icon: Wallet, detail: 'Pagamentos a registrar', note: 'Saldo pendente informado pela plataforma', tone: 'amber' },
    { label: 'Tarefas abertas', value: summary.tarefasAbertas.toLocaleString('pt-BR'), icon: ClipboardList, detail: 'Responsabilidades da casa', note: 'Tarefas que aguardam conclusão', tone: 'neutral' },
  ]
  return <section className="rh-admin-section-cards" aria-label="Indicadores da plataforma">{metrics.map(({ label, value, icon: Icon, detail, note, tone }) => <Card key={label} className={`rh-admin-stat-card ${tone}`}><CardHeader><CardDescription>{label}</CardDescription><CardTitle>{value}</CardTitle><CardAction><Icon size={19} aria-hidden="true" /></CardAction></CardHeader><CardFooter className="flex-col items-start gap-1.5 text-sm"><div className="rh-admin-card-detail">{detail}</div><div className="rh-admin-card-note">{note}</div></CardFooter></Card>)}</section>
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

function Directory({ rows, people }: { rows: RecordRow[]; people: boolean }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const label = people ? 'Usuários' : 'Repúblicas'
  const visible = rows.filter(row =>
    normalize(row.name + ' ' + (row.email ?? '')).includes(normalize(query)) &&
    (status === 'all' || row.active === (status === 'active')),
  )
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  // eslint-disable-next-line react-hooks/incompatible-library -- shadcn Data Table uses the TanStack table instance.
  const table = useReactTable({
    data: visible, columns: directoryColumns,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getRowId: row => row.id, state: { pagination }, onPaginationChange: setPagination, autoResetPageIndex: false,
  })
  const firstPage = () => setPagination(current => ({ ...current, pageIndex: 0 }))
  return <section className="rh-admin-directory" aria-labelledby="master-directory">
    <div className="rh-admin-directory-head">
      <div><h2 id="master-directory">{label}</h2><p role="status">{visible.length} de {rows.length} registros</p></div>
      <div className="rh-admin-tools">
        <label className="rh-admin-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label={people ? 'Buscar usuários' : 'Buscar repúblicas'} placeholder={people ? 'Nome ou e-mail' : 'Buscar por nome'} value={query} onChange={event => { setQuery(event.target.value); firstPage() }} /></label>
        <FilterCombobox label="Filtrar por status" value={status} onChange={value => { setStatus(value); firstPage() }} items={[{ value: 'all', label: 'Todos os status' }, { value: 'active', label: people ? 'Ativos' : 'Ativas' }, { value: 'inactive', label: people ? 'Inativos' : 'Inativas' }]} />
      </div>
    </div>
    <Table aria-label={label}>
      <TableHeader><TableRow><TableHead scope="col">Nome</TableHead><TableHead scope="col">Status</TableHead></TableRow></TableHeader>
      <TableBody>
        {table.getRowModel().rows.map(({ original: row }) => <TableRow key={row.id}>
          <TableCell><div className="rh-admin-record"><span aria-hidden="true">{people ? row.name.trim().slice(0, 2).toUpperCase() : <Building2 size={17} />}</span><div><strong>{row.name}</strong><small>{row.email || `ID ${row.id}`}</small></div></div></TableCell>
          <TableCell><span className="rh-admin-badge" data-active={row.active}>{row.active ? people ? 'Ativo' : 'Ativa' : people ? 'Inativo' : 'Inativa'}</span></TableCell>
        </TableRow>)}
        {visible.length === 0 && <TableRow><TableCell colSpan={2} className="rh-admin-empty">{rows.length ? 'Nenhum registro corresponde aos filtros.' : 'Nenhum registro disponível.'}</TableCell></TableRow>}
      </TableBody>
    </Table>
    {/* Pagination ported from dashboard-01/components/data-table.tsx; no row selection because there is no bulk action. */}
    <div className="rh-admin-pagination"><div className="rh-admin-page-size"><span>Linhas por página</span><FilterCombobox label="Linhas por página" value={String(pagination.pageSize)} onChange={value => { table.setPageSize(Number(value)); firstPage() }} items={[10, 20, 30, 40, 50].map(size => ({ value: String(size), label: String(size) }))} /></div><span>Página {pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)}</span><div className="rh-admin-page-actions"><GlisseButton className="rh-admin-page-edge" variant="secondary" aria-label="Primeira página" disabled={!table.getCanPreviousPage()} onClick={() => table.setPageIndex(0)}><ChevronsLeft size={15} /></GlisseButton><GlisseButton variant="secondary" aria-label="Página anterior" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><ChevronLeft size={15} /></GlisseButton><GlisseButton variant="secondary" aria-label="Próxima página" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><ChevronRight size={15} /></GlisseButton><GlisseButton className="rh-admin-page-edge" variant="secondary" aria-label="Última página" disabled={!table.getCanNextPage()} onClick={() => table.setPageIndex(table.getPageCount() - 1)}><ChevronsRight size={15} /></GlisseButton></div></div>
  </section>
}

export default function Admin({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('resumo')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [data, setData] = useState<{ summary: Summary; houses: House[]; users: User[] }>()

  useEffect(() => {
    let current = true
    Promise.all([
      request<Summary>('/master/dashboard', token),
      request<House[]>('/master/republicas', token),
      request<User[]>('/master/usuarios', token),
    ]).then(([summary, houses, users]) => {
      if (current) setData({ summary, houses, users })
    }).catch((failure: Error) => {
      if (current) setError(failure.message)
    })
    return () => { current = false }
  }, [token, attempt])

  const people = tab === 'usuarios'
  const title = tabs.find(item => item.value === tab)?.label
  const rows = people
    ? data?.users.map(user => ({ id: user.id, name: user.nome, email: user.email, active: user.ativo }))
    : data?.houses.map(house => ({ id: house.id, name: house.nome, active: house.ativa }))
  const activeHouses = data?.houses.filter(house => house.ativa).length ?? 0
  const summary = data?.summary

  return <div className="rh-admin" data-sidebar-collapsed={sidebarCollapsed}>
    <aside className="rh-admin-rail">
      <a href="/" className="rh-admin-brand" aria-label="RepHouse, página inicial"><img src="/rephouse.svg" width="36" height="36" alt="" /><span>RepHouse</span></a>
      <nav aria-label="Administração master">
        {tabs.map(({ value, label, icon: Icon }) => <GlisseButton key={value} variant="secondary" className="rh-admin-nav-action" aria-label={label} title={sidebarCollapsed ? label : undefined} aria-current={value === tab ? 'page' : undefined} onClick={() => setTab(value)} icon={<Icon size={18} aria-hidden="true" />}><span>{label}</span></GlisseButton>)}
      </nav>
      <div className="rh-admin-rail-foot"><span aria-hidden="true">RH</span><div><strong>Administração</strong><small>Acesso master</small></div></div>
    </aside>
    <div className="rh-admin-workspace">
      <header className="rh-admin-bar">
        {/* SiteHeader composition from Dashboard 01: trigger, separator, title, trailing actions. */}
        <div className="rh-admin-header-path"><GlisseButton variant="secondary" className="rh-admin-sidebar-trigger" aria-label={sidebarCollapsed ? 'Expandir navegação' : 'Recolher navegação'} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed(value => !value)}><PanelLeft size={17} /></GlisseButton><span className="rh-admin-header-separator" aria-hidden="true" /><span>Administração</span><ChevronRight size={13} aria-hidden="true" /><strong>{title}</strong></div>
        <div className="rh-admin-actions"><AppearanceControl compact /><GlisseButton variant="secondary" onClick={onLogout} icon={<LogOut size={16} aria-hidden="true" />}>Sair</GlisseButton></div>
      </header>
      <main className="rh-admin-main">
        <AnimatedTitle key={tab} className="rh-admin-title">{tab === 'resumo' ? 'Visão da plataforma' : title ?? 'Administração'}</AnimatedTitle>
        <p>{tab === 'resumo' ? 'Acompanhe a operação das repúblicas em um só lugar.' : people ? 'Consulte as contas e o status de acesso.' : 'Consulte as casas cadastradas na plataforma.'}</p>
        {error ? <section className="rh-admin-state"><p role="alert">{error}</p><GlisseButton onClick={() => { setError(''); setAttempt(value => value + 1) }}>Tentar novamente</GlisseButton></section> : !data ? <section className="rh-admin-state" aria-busy="true"><p role="status">Carregando administração…</p></section> : <>
          {tab === 'resumo' && summary && <SectionCards summary={summary} houses={data.houses} users={data.users} />}
          {tab === 'resumo' && <FinanceChart points={summary?.historicoIlustrativo} />}
          <div className={tab === 'resumo' ? 'rh-admin-overview' : ''}>
            <Directory key={tab} rows={rows ?? []} people={people} />
            {tab === 'resumo' && <section className="rh-admin-health">
              <div className="rh-admin-health-heading"><Building2 size={22} aria-hidden="true" /><span>Cadastros</span></div><h2>Situação das repúblicas</h2>
              <p>Distribuição das casas cadastradas.</p>
              <div className="rh-admin-distribution" aria-hidden="true"><span style={{ width: (data.houses.length ? activeHouses / data.houses.length * 100 : 0) + '%' }} /></div>
              <dl><div><dt>Ativas</dt><dd>{activeHouses}</dd></div><div><dt>Inativas</dt><dd>{data.houses.length - activeHouses}</dd></div></dl>
              <GlisseButton variant="secondary" className="rh-admin-view-directory" onClick={() => setTab('republicas')}>Consultar repúblicas <ArrowUpRight size={15} /></GlisseButton>
              <div className="rh-admin-scope-note"><ShieldCheck size={16} /><p>Visão global dos cadastros. As permissões de cada conta continuam sendo definidas pela plataforma.</p></div>
            </section>}
          </div>
          <div className="rh-admin-data-caption"><Check size={13} aria-hidden="true" />Valores e situações informados pela plataforma.</div>
        </>}
      </main>
    </div>
    <div className="rh-admin-dock">
      <TabBar aria-label="Área de administração" value={tab} onValueChange={value => setTab(value as Tab)} items={tabs.map(({ value, label, icon: Icon }) => ({ value, label, icon: <Icon size={18} aria-hidden="true" /> }))} />
    </div>
  </div>
}
