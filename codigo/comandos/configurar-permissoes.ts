import { randomBytes } from 'node:crypto'
import { readFile, writeFile, rename, unlink } from 'node:fs/promises'
import { parse } from 'dotenv'
import pg from 'pg'
import { provisionRuntimeRole } from '../infraestrutura/banco/permissoes.js'

/** Ferramenta administrativa local. Não é importada nem executada pelo servidor HTTP. */
async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('PRODUCTION_REFUSED')
  const compose = process.argv.includes('--compose')
  if (process.argv.slice(2).some(arg => arg !== '--compose') || (compose && process.env.REPHOUSE_LOCAL_MAINTENANCE !== '1')) {
    throw new Error('INVALID_CONTEXT')
  }
  const original = await readFile('.env', 'utf8')
  const env = parse(original)
  if (env.NODE_ENV === 'production') throw new Error('PRODUCTION_REFUSED')
  const admin = new URL(env.MIGRATIONS_DATABASE_URL || env.DATABASE_URL || '')
  if (!['postgresql:', 'postgres:'].includes(admin.protocol) || !['localhost', '127.0.0.1'].includes(admin.hostname)
    || admin.port !== '5432' || admin.pathname !== '/rabbu_mvp' || !admin.password || !admin.username
    || [...admin.searchParams].some(([key, value]) => key !== 'schema' || value !== 'public')) {
    throw new Error('LOCAL_DATABASE_REQUIRED')
  }
  const role = env.API_DB_USER || 'rephouse_api'
  if (decodeURIComponent(admin.username) === role) throw new Error('ADMIN_REQUIRED')
  const password = env.API_DB_PASSWORD || randomBytes(32).toString('hex')
  const connection = new URL(admin)
  if (compose) connection.hostname = 'postgres'
  const db = new pg.Client({ connectionString: connection.toString(), connectionTimeoutMillis: 5000 })
  try {
    await db.connect()
    await provisionRuntimeRole(db, { role, password, schema: 'public' })
  } finally { await db.end() }

  const runtime = new URL(admin)
  runtime.username = role
  runtime.password = password
  const values = { MIGRATIONS_DATABASE_URL: admin.toString(), API_DB_USER: role, API_DB_PASSWORD: password, DATABASE_URL: runtime.toString() }
  let result = original
  for (const [key, value] of Object.entries(values)) {
    // Aspas simples preservam caracteres de URL no parser dotenv; não passam por shell.
    if (value.includes("'") || /[\r\n]/.test(value)) throw new Error('INVALID_ENV_VALUE')
    const line = `${key}='${value}'`
    const expression = new RegExp(`^${key}=.*$`, 'm')
    result = expression.test(result) ? result.replace(expression, () => line) : `${result.replace(/\s*$/, '')}\n${line}\n`
  }
  // Recusa sobrescrever uma edição simultânea de credenciais/configuração.
  if (await readFile('.env', 'utf8') !== original) throw new Error('ENV_CHANGED_RETRY')
  const temporary = `.env.permissoes-${randomBytes(8).toString('hex')}`
  try {
    await writeFile(temporary, result, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    await rename(temporary, '.env')
  } finally { await unlink(temporary).catch(() => {}) }
  console.log('Conta limitada provisionada; DATABASE_URL separada da credencial administrativa. Nenhuma migration foi aplicada.')
}

void main().catch(error => {
  // Nunca imprimir objeto pg, SQL, URL ou mensagem interna com credenciais.
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^[A-Z0-9_]{2,40}$/.test(error.code) ? error.code : 'CONFIGURATION_REFUSED'
  console.error(`Provisionamento não concluído (${code}). Confira o guia de permissões e a configuração local; credenciais não foram exibidas.`)
  process.exitCode = 1
})
