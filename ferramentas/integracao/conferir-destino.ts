import 'dotenv/config'
import pg from 'pg'
import { validarDestinoTestes } from './destino-testes.js'

const url = validarDestinoTestes(process.env.TEST_DATABASE_URL)
const connection = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 })
try {
  await connection.connect()
  const result = await connection.query<{ banco: string; usuario: string; versao: string }>(
    "SELECT current_database() banco, current_user usuario, current_setting('server_version_num') versao")
  const actual = result.rows[0]!
  if (actual.banco !== 'rabbu_mvp_test' || actual.usuario !== url.username || !actual.versao.startsWith('18')) {
    throw new Error('Identidade do PostgreSQL de testes divergente.')
  }
  console.log('Destino exclusivo de testes conferido antes de executar as suítes.')
} catch {
  console.error('Não foi possível confirmar a identidade do PostgreSQL dedicado aos testes. Nenhuma suíte foi iniciada.')
  process.exitCode = 1
} finally { await connection.end() }
