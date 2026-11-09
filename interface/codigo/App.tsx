import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Expenses from './Expenses'
import { request, brl } from './api'
import './App.css'

type User = { id: string; nome: string; tipoUsuario: string; membro: { id: string } | null }
type House = { nome: string; codigoEntrada?: string; adminId?: string }
type Dashboard = { totalPendente: string; totalPagoNoMes: string; tarefasAbertas: number }

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('rephouse-token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [house, setHouse] = useState<House | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [register, setRegister] = useState(false)
  const [create, setCreate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!token) return
    let active = true
    async function load() {
      try {
        const profile = await request<User>('/me', token)
        if (!active) return
        if (!profile.membro) { setUser(profile); return }
        const [current, summary] = await Promise.all([
          request<House>('/republicas/atual', token), request<Dashboard>('/dashboard', token),
        ])
        if (active) { setUser(profile); setHouse(current); setDashboard(summary) }
      } catch (err) {
        if (!active) return
        if ((err as { status?: number }).status === 401) {
          sessionStorage.removeItem('rephouse-token')
          setToken('')
          setUser(null)
          setHouse(null)
          setDashboard(null)
        }
        setError((err as Error).message)
      }
    }
    void load()
    return () => { active = false }
  }, [token, refresh])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    setError('')
    try {
      if (!token) {
        const result = await request<{ token: string }>(register ? '/auth/register' : '/auth/login', undefined, fields)
        sessionStorage.setItem('rephouse-token', result.token)
        setToken(result.token)
      } else {
        await request(create ? '/republicas' : '/republicas/entrar', token, fields)
        setUser(null)
        setRefresh(value => value + 1)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally { setBusy(false) }
  }

  async function logout() {
    setBusy(true)
    try {
      await request('/auth/logout', token, {})
      sessionStorage.removeItem('rephouse-token')
      setToken('')
      setUser(null)
      setHouse(null)
      setDashboard(null)
      setError('')
    } catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }

  const alert = error && <p className="notice" role="alert">{error}</p>
  return (
    <div className="shell">
      <header className="top"><span className="wordmark"><span className="mark" aria-hidden="true">R</span> RepHouse</span>
        {token && <button className="quiet" disabled={busy} onClick={() => void logout()}>Sair</button>}
      </header>
      {!token ? (
        <main className="entry">
          <section className="intro"><span className="eyebrow">GESTÃO DA REPÚBLICA</span><h1>Organize a vida em casa.</h1><p>Despesas, rateios e tarefas da república em um só lugar.</p></section>
          <form className="panel" onSubmit={submit} key={String(register)}>
            <h2>{register ? 'Crie sua conta' : 'Entre na sua conta'}</h2>
            {register && <label>Nome<input name="nome" autoComplete="name" required maxLength={120} /></label>}
            <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
            <label>Senha<input name="senha" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} required /></label>
            {alert}
            <button className="primary" disabled={busy}>{busy ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'}</button>
            <button type="button" className="quiet" disabled={busy} onClick={() => { setRegister(!register); setError('') }}>{register ? 'Já tenho conta' : 'Criar uma conta'}</button>
          </form>
        </main>
      ) : !user ? (
        <main className="workspace" aria-busy={!error}>{alert || <p role="status">Carregando sua república…</p>}
          {error && <button className="quiet" onClick={() => { setError(''); setRefresh(v => v + 1) }}>Tentar novamente</button>}
        </main>
      ) : !house || !dashboard ? (
        <main className="workspace narrow"><h1>Olá, {user.nome}.</h1><p>Entre com um código ou crie a sua república.</p>
          <div className="choices"><button className="quiet" aria-pressed={!create} onClick={() => { setCreate(false); setError('') }}>Entrar por código</button><button className="quiet" aria-pressed={create} onClick={() => { setCreate(true); setError('') }}>Criar república</button></div>
          <form className="panel" onSubmit={submit} key={String(create)}>
            {create ? <label>Nome da república<input name="nome" required maxLength={120} /></label> : <label>Código de entrada<input name="codigoEntrada" required pattern="[A-Za-z0-9]{6,32}" autoCapitalize="characters" /></label>}
            {alert}<button className="primary" disabled={busy}>{busy ? 'Aguarde…' : create ? 'Criar república' : 'Entrar na república'}</button>
          </form>
        </main>
      ) : (
        <main className="workspace"><span className="eyebrow">{house.nome}</span><h1>Sua casa, em dia.</h1><p>Visão geral da república</p>{alert}
          <section className="metrics" aria-label="Resumo da república">
            <article><h2>Em aberto na casa</h2><strong>{brl.format(Number(dashboard.totalPendente))}</strong></article>
            <article><h2>Pagamentos neste mês</h2><strong>{brl.format(Number(dashboard.totalPagoNoMes))}</strong></article>
            <article><h2>Tarefas abertas</h2><strong>{dashboard.tarefasAbertas}</strong></article>
          </section>
          {house.codigoEntrada && <p className="invite">Código de entrada <strong>{house.codigoEntrada}</strong></p>}
          <Expenses token={token} memberId={user.membro?.id} canCreate={user.tipoUsuario === 'USUARIO_MASTER' || (user.tipoUsuario === 'USUARIO_ADMIN' && user.id === house.adminId)} onPayment={() => setRefresh(value => value + 1)} />
        </main>
      )}
    </div>
  )
}

export default App
