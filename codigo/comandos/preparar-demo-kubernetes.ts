import pg from 'pg'
import { provisionRuntimeRole } from '../infraestrutura/banco/permissoes.js'

// Ferramenta exclusiva do Job de demonstração. Nunca lê ou atualiza o .env local.
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '')
  if (process.env.REPHOUSE_DEMO_CONTEXT !== 'kubernetes-local'
    || !['postgres:', 'postgresql:'].includes(url.protocol)
    || url.hostname !== 'postgres.rephouse-demo.svc.cluster.local'
    || url.port !== '5432' || url.pathname !== '/rephouse_devops_demo'
    || decodeURIComponent(url.username) !== 'rephouse_demo_admin'
    || url.searchParams.get('schema') !== 'public'
    || [...url.searchParams].some(([key]) => key !== 'schema')) throw new Error('DEMO_CONTEXT_REQUIRED')
  const password = process.env.DEMO_RUNTIME_PASSWORD ?? ''
  if (!/^[a-f0-9]{64}$/.test(password)) throw new Error('DEMO_RUNTIME_PASSWORD_REQUIRED')
  // Importar somente após o guard: módulos legados carregam dotenv.
  const { createDatabase } = await import('../infraestrutura/banco/client.js')
  const { semearDemonstracao } = await import('../infraestrutura/banco/demonstracao.js')
  const { semearVitrine } = await import('../infraestrutura/banco/vitrine.js')
  const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 })
  try {
    await client.connect()
    await provisionRuntimeRole(client, { role: 'rephouse_demo_api', password, schema: 'public' })
  } finally { await client.end() }
  const database = createDatabase(url.toString())
  try {
    await semearDemonstracao(database, process.env.DEMO_PASSWORD, 'development')
    await semearVitrine(database, process.env.DEMO_PASSWORD, 'development')
  }
  finally { await database.$disconnect() }
  console.log(JSON.stringify({ event: 'demo_prepared', database: 'rephouse_devops_demo' }))
}
// Registra só códigos conhecidos e o tipo do erro: mensagens livres podem conter URL ou senha.
const MOTIVOS_CONHECIDOS = new Set(['DEMO_CONTEXT_REQUIRED', 'DEMO_RUNTIME_PASSWORD_REQUIRED'])
void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : ''
  const reason = MOTIVOS_CONHECIDOS.has(message) ? message : message.startsWith('Schema incompleto') ? 'SCHEMA_INCOMPLETE'
    : error instanceof Error ? error.name : 'UNKNOWN'
  console.error(JSON.stringify({ event: 'demo_setup_failed', reason }))
  process.exitCode = 1
})
