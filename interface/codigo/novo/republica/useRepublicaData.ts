import { errorFeedback } from '../../interno/feedback'
import type { Feedback } from '../../interno/feedback'
import { useEffect, useState } from 'react'
import { request, endSession } from '../../api'
import type { Account, House, Member } from '../../gestao/types'
import type { ExpenseFilter } from '../../gestao/ExpenseFilters'
import type { Expense } from '../Overview'

const filterValues = { Todas: 'TODAS', Pendentes: 'PENDENTES', Próximas: 'PROXIMAS', Atrasadas: 'ATRASADAS', Pagas: 'PAGAS' }
type Dashboard = { totalPendente: string; totalPagoNoMes: string; tarefasAbertas: number; dataReferencia?: string; financeiroIndividual?: import('../../gestao/types').Schemas['ResumoIndividual']; financeiroIndividualGeral?: import('../../gestao/types').Schemas['ResumoIndividual'] }
type Home = { path: string; queryKey?: string; user: Account; house: House | null; dashboard: Dashboard | null; members: Member[]; expenses: Expense[] }
type Options = { token: string; currentPath: string; accountRoute: boolean; filter: ExpenseFilter; competence: string; financialScope: string; financialKey: string }

export function expired(err: unknown) {
  if ((err as { status?: number }).status !== 401) return false
  endSession()
  return true
}

/** Carregamento da tela; a API continua responsável por autorização e saldos. */
export function useRepublicaData({ token, currentPath, accountRoute, filter, competence, financialScope, financialKey }: Options) {
  const [home, setHome] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState<Feedback>('')

  useEffect(() => {
    if (!token) { window.location.replace('/login'); return }
    let active = true
    async function load() {
      try {
        const user = await request<Account>('/me', token)
        if (!active) return
        if (!user.membro || user.tipoUsuario === 'USUARIO_MASTER') {
          setHome({ path: currentPath, user, house: null, dashboard: null, members: [], expenses: [] })
          setError('')
          return
        }
        if (accountRoute) {
          // Perfil e financeiro pessoal ficam dentro da casa (com a barra lateral) para quem mora em uma.
          const [house, members] = await Promise.all([request<House>('/republicas/atual', token), request<Member[]>('/membros', token)])
          if (active) { setHome({ path: currentPath, user, house, dashboard: null, members, expenses: [] }); setError('') }
          return
        }
        const query = new URLSearchParams()
        if (currentPath === '/republica/despesas') {
          if (filter !== 'Todas') query.set('situacao', filterValues[filter])
          if (competence) query.set('competencia', competence)
          if (financialScope !== 'CASA') query.set('escopo', financialScope)
        }
        const financialPage = currentPath === '/republica' || currentPath === '/republica/despesas'
        const [house, dashboard, expenses, members] = await Promise.all([
          request<House>('/republicas/atual', token), financialPage ? request<Dashboard>('/dashboard', token) : Promise.resolve(null),
          financialPage ? request<Expense[]>('/despesas' + (query.size ? '?' + query.toString() : ''), token) : Promise.resolve([]), request<Member[]>('/membros', token),
        ])
        if (active) { setHome({ path: currentPath, queryKey: financialKey, user, house, dashboard, expenses, members }); setError('') }
      } catch (err) {
        if (active && !expired(err)) setError(errorFeedback(err))
      } finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [token, revision, accountRoute, currentPath, filter, competence, financialScope, financialKey])

  function refresh() {
    setLoading(true)
    setError('')
    setRevision(value => value + 1)
  }

  return { home, loading, revision, error, setError, refresh }
}
