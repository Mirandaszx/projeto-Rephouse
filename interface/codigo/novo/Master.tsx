import { useEffect, useState } from 'react'
import { request } from '../api'

type Summary = { usuarios: number; republicas: number }
type House = { id: string; nome: string; ativa: boolean }

export default function Master({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [data, setData] = useState<{ summary: Summary; houses: House[] }>()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    Promise.all([
      request<Summary>('/master/dashboard', token),
      request<House[]>('/master/republicas', token),
    ]).then(([summary, houses]) => {
      if (current) setData({ summary, houses })
    }).catch((failure: Error) => {
      if (current) setError(failure.message)
    })
    return () => { current = false }
  }, [token, attempt])

  return <div className="republica rep-master">
    <main className="rep-main">
      <header className="rep-top"><strong>RepHouse / Administração</strong><button className="rep-secondary" onClick={onLogout}>Sair</button></header>
      <section className="rep-intro"><div><h1 className="rh-enter">Visão global</h1><p>Acompanhe as repúblicas da plataforma.</p></div></section>
      {error ? <div role="alert"><p>{error}</p><button className="rep-secondary" onClick={() => { setError(''); setAttempt(value => value + 1) }}>Tentar novamente</button></div> : data ? <>
        <div className="rep-overview">
          <section className="rep-balance"><p>Repúblicas cadastradas</p><strong>{data.summary.republicas}</strong></section>
          <section className="rep-members"><h2>Usuários cadastrados</h2><p>{data.summary.usuarios}</p></section>
        </div>
        <section className="rep-expenses"><h2>Repúblicas</h2>
          {data.houses.length ? <ul>{data.houses.map(house => <li key={house.id}><strong>{house.nome}</strong><span className="rep-role">{house.ativa ? 'Ativa' : 'Inativa'}</span></li>)}</ul> : <p>Nenhuma república cadastrada.</p>}
        </section>
      </> : <p role="status">Carregando administração…</p>}
    </main>
  </div>
}
