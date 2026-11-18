import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { abrirAmbienteIntegracao, emailIntegracao } from './ambiente.js'
import { createApp } from '../../codigo/app.js'
import { createAuthService } from '../../codigo/modulos/autenticacao/auth.service.js'
import { createRepublicasService } from '../../codigo/modulos/republicas/republicas.service.js'
import { createFinanceiroService } from '../../codigo/modulos/financeiro/financeiro.service.js'
import { createRecorrenciasService, startRecurringScheduler } from '../../codigo/modulos/financeiro/recorrencias.service.js'
import { civilDate } from '../../codigo/configuracao/time-zone.js'
import { prepareReceipt } from '../../codigo/infraestrutura/armazenamento/comprovantes.js'

const env = await abrirAmbienteIntegracao(process.env.TEST_DATABASE_URL, process.env.DEMO_PASSWORD ?? '')
const secret = 'segredo-exclusivo-da-demonstracao-financeira-local'
const auth = createAuthService(env.db, secret), houses = createRepublicasService(env.db), finance = createFinanceiroService(env.db)
let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined
let stopRecurring: (() => Promise<void>) | undefined
try {
  const sessions = await Promise.all((['adminAurora','ana','bruno'] as const).map(name => auth.login({ email: emailIntegracao(name), senha: process.env.DEMO_PASSWORD! })))
  const [admin,ana,bruno] = sessions.map(session => ({ id: session.usuario.id, versaoToken: 0 }))
  const house = await houses.create(admin!, { nome: 'República Financeiro — demonstração' })
  const anaMember = await houses.join(ana!, house.codigoEntrada), brunoMember = await houses.join(bruno!, house.codigoEntrada)
  const owner = await env.db.membroRepublica.findFirstOrThrow({ where: { usuarioId: admin!.id, ativo: true } })
  const today = civilDate()
  const expense = await finance.create(admin!, { titulo: 'Compras da casa — parcial', categoria: 'Mercado', valorTotal: '60.00', vencimento: new Date(today+'T00:00:00Z'), membroIds: [anaMember.id] })
  const receipt = await prepareReceipt(Buffer.from('%PDF-1.4\ncomprovante sintetico da demonstracao financeira\n%%EOF'))
  await finance.pay(ana!, { rateioId: expense.rateios[0]!.id, valor: '25.00', chaveIdempotencia: randomUUID(), comprovante: receipt })
  await createRecorrenciasService(env.db).create(admin!, { titulo: 'Internet — mensal', categoria: 'Internet', valorTotal: '120.00', diaVencimento: 31, inicio: today.slice(0,7), membroIds: [owner.id,brunoMember.id] }, randomUUID())
  server = createApp({ database: env.db, jwtSecret: secret, corsOrigins: ['http://localhost:5175','http://127.0.0.1:5175'], log: () => {} }).listen(3406,'127.0.0.1')
  await once(server,'listening')
  stopRecurring = startRecurringScheduler(env.db, () => {})
  const response = await fetch('http://127.0.0.1:3406/api/me/financeiro/resumo?competencia='+today.slice(0,7), { headers: { Authorization: `Bearer ${sessions[1]!.token}` } })
  const summary = await response.json() as { totalDevido: string; totalPago: string; saldoPendente: string }
  if (response.status !== 200 || summary.totalDevido !== '60.00' || summary.totalPago !== '25.00' || summary.saldoPendente !== '35.00') throw new Error('A demonstração não confirmou os totais esperados.')
  console.log(JSON.stringify({ demonstracao: 'financeiro-2.2.0', resultado: 'aprovado', totalDevido: summary.totalDevido, totalPago: summary.totalPago, saldoPendente: summary.saldoPendente, despesas: await env.db.despesa.count() }))
  if (!process.argv.includes('--verificar')) {
    console.log('API em http://127.0.0.1:3406. Use interface na porta 5175 com API_PROXY_TARGET=http://127.0.0.1:3406. Contas: admin.aurora@integracao.rephouse.test, ana@integracao.rephouse.test e bruno@integracao.rephouse.test. A senha é DEMO_PASSWORD, definida no seu terminal. Ctrl+C encerra somente esta demonstração.')
    await new Promise<void>(resolve => {
      const finish = () => { process.removeListener('SIGINT',finish); process.removeListener('SIGTERM',finish); resolve() }
      process.once('SIGINT',finish);process.once('SIGTERM',finish)
    })
  }
} finally {
  await stopRecurring?.()
  if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())) }
  await env.close()
}
