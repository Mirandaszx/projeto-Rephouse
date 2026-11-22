import type { Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const shots = fileURLToPath(new URL('../../../.devops-local/interface/imagens/modernizacao-interna', import.meta.url))
const id = '11111111-1111-4111-8111-111111111111'
const house = { id: '22222222-2222-4222-8222-222222222222', nome: 'República Jardim', adminId: id, endereco: null, ativa: true, codigoEntrada: 'JARDIM26', criadaEm: '2026-01-01T00:00:00Z' }
export type Fixture = { master?: boolean; resident?: boolean; noHouse?: boolean; empty?: boolean; long?: boolean; taskError?: boolean; longError?: boolean; loading?: Promise<void>; expenseReference?: { due: string; day: string; state?: string }; dashboard?: { totalPendente: string; totalPagoNoMes: string; tarefasAbertas: number } }

export async function prepare(page: Page, state: Fixture = {}) {
  await page.addInitScript(() => { sessionStorage.setItem('rephouse-token', 'fixture-visual-sem-validade'); localStorage.setItem('rephouse-appearance', 'system') })
  // Cenários visuais controlados. A regressão em jornadas.spec/gestao.spec usa HTTP e PostgreSQL reais.
  await page.route('**/api/**', async route => {
    if (route.request().method() !== 'GET') return route.abort('blockedbyclient')
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    const name = state.long ? 'Moradora'.repeat(22) : 'Camila Almeida'
    const user = { id, nome: name, email: state.long ? 'nome'.repeat(45) + '@integracao.rephouse.test' : 'camila@integracao.rephouse.test', tipoUsuario: state.master ? 'USUARIO_MASTER' : state.resident ? 'USUARIO_NORMAL' : 'USUARIO_ADMIN', ativo: true, criadoEm: house.criadaEm, membro: state.noHouse || state.master ? null : { id: 'm1', republicaId: house.id, usuarioId: id, ativo: true, entrouEm: house.criadaEm, republica: house } }
    const members = [{ id: 'm1', ativo: true, usuario: { id, nome: name } }, { id: 'm2', ativo: true, usuario: { id: 'u2', nome: 'João Victor' } }]
    const expense = { id: 'd1', titulo: state.long ? 'Despesa'.repeat(24) : 'Internet da casa', categoria: 'Contas da casa', valorTotal: state.long ? '9999999999.99' : '120.00', vencimento: '2000-01-10T00:00:00Z', criadaEm: '2026-01-01T00:00:00Z', rateios: [{ id: 'r1', membroId: 'm1', valorDevido: '120.00', valorPago: '40.00' }] }
    if (state.expenseReference) expense.vencimento = state.expenseReference.due + 'T00:00:00Z'
    const reference = state.expenseReference ? { dataReferencia: state.expenseReference.day, situacaoVencimento: state.expenseReference.state } : {}
    const tasks = [{ id: 't1', titulo: state.long ? 'Tarefa'.repeat(28) : 'Organizar a cozinha', descricao: 'Lavar a louça e deixar a bancada livre.', status: 'ABERTA', prazo: '2000-01-10T00:00:00Z', responsavelId: 'm1' }, { id: 't2', titulo: 'Cuidar das plantas', status: 'CONCLUIDA', prazo: null, responsavelId: 'm2' }]
    const personal = [{ ...expense.rateios[0], despesaId: expense.id, status: 'PARCIAL', pagamentos: [], despesa: { ...expense, republica: { id: house.id, nome: house.nome } } }, { ...expense.rateios[0], id: 'r2', despesaId: 'd2', status: 'PENDENTE', pagamentos: [], despesa: { ...expense, titulo: 'Compras da casa anterior', republica: { id: 'h2', nome: 'República do Sol' } } }]
    const personalSummary = { competencia: null, dataReferencia: '2026-11-17', totalDevido: state.empty ? '0.00' : '240.00', totalPago: state.empty ? '0.00' : '80.00', saldoPendente: state.empty ? '0.00' : '160.00', totalItens: state.empty ? 0 : 2, rateiosPendentes: state.empty ? 0 : 2 }
    const dashboard = { ...(state.dashboard ?? (state.empty ? { totalPendente: '0.00', totalPagoNoMes: '0.00', tarefasAbertas: 0 } : { totalPendente: '80.00', totalPagoNoMes: '40.00', tarefasAbertas: 1 })), financeiroIndividualGeral: { ...personalSummary, saldoPendente: state.empty ? '0.00' : String(Number(expense.valorTotal) - 40), rateiosPendentes: state.empty ? 0 : 1 } }
    const situation = new URL(route.request().url()).searchParams.get('situacao')
    if (path === '/tarefas' && state.loading) await state.loading
    if (path === '/tarefas' && state.taskError) return route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: state.longError ? 'Tarefas indisponíveis para conferência. ' + 'Aguarde um momento e tente novamente. '.repeat(15) : 'Tarefas indisponíveis para conferência.' } } })
    const responses: Record<string, unknown> = {
      '/me': user, '/republicas/atual': house, '/dashboard': dashboard,
      '/membros': members, '/despesas': state.empty || situation === 'PAGAS' ? [] : [{ ...expense, ...reference }], '/tarefas': state.empty ? [] : tasks, '/me/financeiro': state.empty ? [] : personal, '/me/financeiro/resumo': personalSummary, '/recorrencias': [],
      '/master/dashboard': { usuarios: 1000, republicas: 100, totalPendente: '80.00', tarefasAbertas: 1 }, '/master/republicas': [{ ...house, nome: state.long ? 'República'.repeat(25) : house.nome }], '/master/usuarios': [user],
    }
    if (!(path in responses)) return route.fulfill({ status: 404, json: { error: { code: 'FIXTURE_MISSING', message: path } } })
    return route.fulfill({ status: 200, json: responses[path] })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mkdir(shots, { recursive: true })
}
