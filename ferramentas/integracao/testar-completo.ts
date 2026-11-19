import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import pg from 'pg'
import { URL_TESTES_LOCAL, validarDestinoTestes } from './destino-testes.js'

// Não carregar dotenv: a URL da aplicação nunca participa da escolha do destino.
const url = validarDestinoTestes(process.env.TEST_DATABASE_URL ?? URL_TESTES_LOCAL, false)
const npm = process.env.npm_execpath
if (!npm) throw new Error('Execute com npm run test:completo.')
const schema = `complete_test_${randomUUID().replaceAll('-', '')}`
const isolated = new URL(url); isolated.searchParams.set('schema', schema)
const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: isolated.toString(), TEST_DATABASE_URL: isolated.toString(),
  DOTENV_CONFIG_OVERRIDE: 'false',
  JWT_SECRET: 'segredo-exclusivo-da-verificacao-completa-local-2026', GOOGLE_CLIENT_ID: '', CORS_ORIGINS: '',
  FORCE_COLOR: '0', NODE_DISABLE_COLORS: '1', NO_COLOR: '1' }
const directory = '.devops-local/testes-criticos'
await mkdir(directory, { recursive: true })
const id = new Date().toISOString().replaceAll(':', '-'), steps: { comando: string; codigo: number }[] = []
let output = '', setup: pg.Client | undefined, created = false, removed = false, result = 1
const hashes = async () => Promise.all(['documentacao/openapi.json', 'integracao/api.d.ts'].map(async file =>
  ({ file, sha256: createHash('sha256').update(await readFile(file)).digest('hex') })))
const before = await hashes()
async function run(binary: string, args: string[], label: string) {
  console.log(`\n${label}`)
  const code = await new Promise<number>(resolve => {
    const child = spawn(binary, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    for (const [stream, target] of [[child.stdout, process.stdout], [child.stderr, process.stderr]] as const) {
      stream!.on('data', (chunk: Buffer) => { output += chunk.toString(); target.write(chunk) })
    }
    child.once('error', () => resolve(1)); child.once('close', value => resolve(value ?? 1))
  })
  steps.push({ comando: label, codigo: code })
  return code
}
try {
  if (await run('docker', ['info', '--format', '{{.ServerVersion}}'], 'Verificar Docker') !== 0) throw new Error('Docker indisponível.')
  if (await run('docker', ['compose', '-f', 'interface/docker-compose.test.yml', 'up', '-d', '--wait', '--no-deps', 'postgres'], 'Iniciar somente PostgreSQL de testes') !== 0) throw new Error('PostgreSQL de testes indisponível.')
  setup = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 })
  await setup.connect()
  const identity = await setup.query<{ banco: string; usuario: string; versao: string; fsync: string; synchronous_commit: string; full_page_writes: string }>(
    "SELECT current_database() banco, current_user usuario, current_setting('server_version_num') versao, current_setting('fsync') fsync, current_setting('synchronous_commit') synchronous_commit, current_setting('full_page_writes') full_page_writes")
  const actual = identity.rows[0]!
  if (actual.banco !== 'rabbu_mvp_test' || actual.usuario !== 'rephouse_interface_test' || !actual.versao.startsWith('18')
    || actual.fsync !== 'on' || actual.synchronous_commit !== 'on' || actual.full_page_writes !== 'on') throw new Error('Identidade ou durabilidade do PostgreSQL de testes divergente.')
  // Nome produzido internamente e validado; nunca aceitar identificador vindo do ambiente.
  if (!/^complete_test_[a-f0-9]{32}$/.test(schema)) throw new Error('Schema temporário inválido.')
  await setup.query(`CREATE SCHEMA "${schema}"`); created = true
  if (await run(process.execPath, [npm, 'run', 'db:deploy'], 'Aplicar migrations somente no schema temporário') !== 0) throw new Error('Falha nas migrations de testes.')
  result = await run(process.execPath, [npm, 'run', 'verificar'], 'Verificação completa do backend e request specs')
  const skipped = [...output.matchAll(/^# skipped (\d+)\s*$/gm)].reduce((sum, match) => sum + Number(match[1]), 0)
  const cancelled = [...output.matchAll(/^# cancelled (\d+)\s*$/gm)].reduce((sum, match) => sum + Number(match[1]), 0)
  if (skipped || cancelled || !/^# tests \d+/m.test(output)) result = 1
  if (JSON.stringify(before) !== JSON.stringify(await hashes())) {
    console.error('Contrato ou tipos foram alterados pela geração; confira a divergência.'); result = 1
  }
} catch (error) {
  // Mensagens locais são constantes; erros pg podem conter a configuração recebida.
  console.error(error instanceof Error && !('code' in error) ? error.message : 'Falha ao preparar ou consultar o banco de testes.')
  result = 1
} finally {
  try { if (created) { await setup!.query(`DROP SCHEMA "${schema}" CASCADE`); removed = true } }
  catch { console.error('Falha ao remover somente o schema temporário desta execução.'); result = 1 }
  finally { await setup?.end() }
  const totals = (name: string) => [...output.matchAll(new RegExp(`^# ${name} (\\d+)\\s*$`, 'gm'))].reduce((sum, match) => sum + Number(match[1]), 0)
  const report = { executadoEm: new Date().toISOString(), ambiente: 'local', destino: { host: url.hostname, porta: url.port, banco: 'rabbu_mvp_test', usuario: url.username },
    etapas: steps, totais: { testes: totals('tests'), aprovados: totals('pass'), falhas: totals('fail'), ignorados: totals('skipped'), cancelados: totals('cancelled') },
    codigoSaida: result, schemaTemporario: schema, schemaRemovido: !created || removed, contratoAntes: before, contratoDepois: await hashes() }
  await writeFile(`${directory}/${id}.log`, output)
  await writeFile(`${directory}/${id}.json`, JSON.stringify(report, null, 2) + '\n')
  console.log(`\nResultado local: ${report.totais.aprovados} aprovados; ${report.totais.falhas} falhas; ${report.totais.ignorados} ignorados. Relatório: ${directory}/${id}.json`)
  process.exitCode = result
}
