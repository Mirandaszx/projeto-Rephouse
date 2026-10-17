import { spawn } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { createHash, randomUUID } from 'node:crypto'
import { resolve, join, relative, isAbsolute } from 'node:path'
import { parse } from 'dotenv'
import { z } from 'zod'
import { withProjectLock } from './project-lock.js'
import { appTimeZone } from '../configuracao/time-zone.js'

export const root = resolve(import.meta.dirname, '../..')
export async function command(args: string[], options: { env?: NodeJS.ProcessEnv; input?: string; output?: string; stdinFile?: string } = {}): Promise<string> {
  const child = spawn('docker', args, { cwd: root, env: options.env ?? process.env, shell: false, stdio: ['pipe', 'pipe', 'pipe'] })
  const chunks: Buffer[] = []
  // Diagnóstico do Docker pode conter DSN/ambiente. Não é propagado ao terminal.
  child.stderr.resume()
  const ended = new Promise<void>((ok, fail) => {
    child.once('error', fail)
    child.once('close', code => code === 0 ? ok() : fail(new Error(`Docker falhou (${args[0]}, código ${code}). Consulte os logs da configuração selecionada.`)))
  })
  const output = options.output ? pipeline(child.stdout, createWriteStream(options.output, { flags: 'wx', mode: 0o600 })) : Promise.resolve().then(() => { child.stdout.on('data', chunk => chunks.push(Buffer.from(chunk))) })
  const input = options.stdinFile ? pipeline(createReadStream(options.stdinFile), child.stdin) : Promise.resolve().then(() => { child.stdin.end(options.input) })
  await Promise.all([ended, output, input])
  return Buffer.concat(chunks).toString('utf8').trim()
}

export interface Stack { project: string; env: NodeJS.ProcessEnv; compose: string; args: string[] }
export async function stack(project: string, envFile = '.env.backend', config = 'backend'): Promise<Stack> {
  if (!/^[a-z][a-z0-9-]{1,62}$/.test(project)) throw new Error('Nome de projeto inválido.')
  if (!['backend', 'desenvolvimento'].includes(config)) throw new Error('Configuração inválida.')
  const env = { ...process.env, ...parse(await readFile(resolve(root, envFile))) }
  const compose = config === 'backend' ? 'docker-compose.backend.yml' : 'docker-compose.yml'
  return { project, env, compose, args: ['compose', '--env-file', resolve(root, envFile), '-f', compose, '-p', project] }
}
export const compose = (s: Stack, args: string[], opts: { input?: string; output?: string; stdinFile?: string } = {}) => command([...s.args, ...args], { env: s.env, ...opts })
export async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
const identifier=z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
const hash=z.string().regex(/^[a-f0-9]{64}$/)
export const manifestSchema=z.object({format:z.literal(1),createdAt:z.iso.datetime(),applicationVersion:z.string().min(1).max(128),revision:z.string().regex(/^sha256:[a-f0-9]{64}$/),project:z.string().regex(/^[a-z][a-z0-9-]{1,62}$/),database:identifier,user:identifier,timeZone:z.string().default('America/Sao_Paulo').refine(value=>{try{appTimeZone(value);return true}catch{return false}}),files:z.object({'banco.dump':hash,'comprovantes.tar.gz':hash}).strict()}).strict()
type Manifest=z.infer<typeof manifestSchema>
export async function backup(s: Stack, run: typeof compose = compose, inspect: typeof command = command): Promise<string> {
  return withProjectLock(s.project,join(root,'.devops-local','travas'),()=>captureBackup(s,run,inspect))
}
async function captureBackup(s:Stack,run:typeof compose,inspect:typeof command):Promise<string>{
  const postgres = await run(s, ['ps', '-q', 'postgres'])
  const api = await run(s, ['ps', '-q', 'api'])
  if (!postgres || !api) throw new Error('Banco e API precisam estar em execução antes do backup.')
  const mounts = JSON.parse(await inspect(['inspect','--format','{{json .Mounts}}',api],{env:s.env})) as {Type:string;Name?:string;Destination:string}[]
  const expectedVolume=`${s.project}_${s.compose==='docker-compose.backend.yml'?'comprovantes':'comprovantes_data'}`
  if (!mounts.some(mount=>mount.Type==='volume'&&mount.Name===expectedVolume&&mount.Destination==='/app/armazenamento/comprovantes')) throw new Error('A API precisa usar o volume de comprovantes da configuração selecionada. Confira as montagens antes do backup.')
  const runtime = JSON.parse(await run(s, ['exec', '-T', 'api', 'node', '-e', 'require("dotenv").config({quiet:true});process.stdout.write(JSON.stringify({version:require("./package.json").version,timeZone:process.env.APP_TIME_ZONE??"America/Sao_Paulo",uploadDir:process.env.UPLOAD_DIR??"armazenamento/comprovantes"}))'])) as {version:string;timeZone:string;uploadDir?:string}
  if (!['armazenamento/comprovantes','/app/armazenamento/comprovantes'].includes(runtime.uploadDir ?? 'armazenamento/comprovantes')) throw new Error('Backup exige UPLOAD_DIR no volume padrão de comprovantes.')
  const directory = join(root, 'copias-seguranca', `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`)
  await mkdir(directory, { recursive: true, mode: 0o700 })
  // Sem stop concluído não há captura. O finally também cobre erro no próprio stop.
  try {
    await run(s, ['stop', '-t', '15', 'api'])
    await run(s, ['exec', '-T', 'postgres', 'sh', '-c', 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --create'], { output: join(directory, 'banco.dump') })
    await run(s, ['run', '--rm', '--no-deps', '-T', '--user', '0', '--entrypoint', 'tar', 'api', '-C', '/app/armazenamento/comprovantes', '-czf', '-', '.'], { output: join(directory, 'comprovantes.tar.gz') })
    const metadata = JSON.parse(await run(s, ['exec', '-T', 'postgres', 'sh', '-c', 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT json_build_object(\'database\',current_database(),\'user\',current_user)"'])) as { database: string; user: string }
    // A revisão da imagem identifica o código realmente executado, inclusive sem Git no host.
    const revision = await command(['inspect', '--format', '{{.Image}}', api], { env: s.env })
    const manifest: Manifest = { format: 1, createdAt: new Date().toISOString(), applicationVersion: runtime.version, timeZone:runtime.timeZone, revision, project: s.project, ...metadata,
      files: { 'banco.dump': await sha256(join(directory, 'banco.dump')), 'comprovantes.tar.gz': await sha256(join(directory, 'comprovantes.tar.gz')) } }
    await writeFile(join(directory, 'manifesto.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    return directory
  } finally { await run(s, ['start', 'api']) }
}

export async function restore(s: Stack, directory: string): Promise<void> {
  return withProjectLock(s.project,join(root,'.devops-local','travas'),()=>restoreBackup(s,directory))
}
async function restoreBackup(s:Stack,directory:string):Promise<void>{
  if (s.compose !== 'docker-compose.backend.yml' || !/^rephouse-restauracao-[a-z0-9-]+$/.test(s.project)) throw new Error('Restauração exige projeto novo rephouse-restauracao-<nome> na configuração backend.')
  // Nenhum container ou volume preexistente pode ser reutilizado como destino.
  for (const kind of ['container', 'volume']) {
    if (await command([kind, 'ls', ...(kind === 'container' ? ['-a'] : []), '-q', '--filter', `label=com.docker.compose.project=${s.project}`], { env: s.env })) throw new Error('Destino já possui recursos; escolha outro nome de projeto.')
  }
  const source = resolve(directory)
  const parsed=manifestSchema.safeParse(JSON.parse(await readFile(join(source,'manifesto.json'),'utf8')))
  if(!parsed.success)throw new Error('Manifesto inválido.')
  const manifest=parsed.data
  for (const name of ['banco.dump', 'comprovantes.tar.gz'] as const) {
    if (await sha256(join(source, name)) !== manifest.files[name]) throw new Error(`Hash inválido: ${name}`)
  }
  const targetUrl = new URL(s.env.BACKEND_DATABASE_URL!)
  if (targetUrl.hostname !== 'postgres' || targetUrl.pathname !== `/${manifest.database}` || decodeURIComponent(targetUrl.username) !== manifest.user || s.env.BACKEND_DB_USER !== manifest.user) throw new Error('Destino deve manter usuário e nome do banco, com host postgres.')
  if ((s.env.BACKEND_TIME_ZONE ?? 'America/Sao_Paulo') !== (manifest.timeZone ?? 'America/Sao_Paulo')) throw new Error('Configure BACKEND_TIME_ZONE no arquivo de destino conforme o manifesto.')
  // Cluster novo nasce com "postgres"; --create restaura o banco e suas configurações.
  s.env.BACKEND_DB_NAME = 'postgres'
  s.env.BACKEND_TIME_ZONE = manifest.timeZone ?? 'America/Sao_Paulo'
  await compose(s, ['up', '-d', '--wait', 'postgres'])
  await compose(s, ['exec', '-T', 'postgres', 'sh', '-c', 'exec pg_restore --exit-on-error --create -U "$POSTGRES_USER" -d postgres'], { stdinFile: join(source, 'banco.dump') })
  // Somente arquivos produzidos pelo nosso tar, nunca caminhos absolutos ou links.
  const listing = await compose(s, ['run', '--rm', '--no-deps', '-T', '--user', '0', '--entrypoint', 'tar', 'api', '-tzf', '-'], { stdinFile: join(source, 'comprovantes.tar.gz') })
  if (listing.split('\n').some(name => name !== './' && !/^\.\/[a-f0-9-]{36}\.(pdf|png|jpg|webp)$/.test(name))) throw new Error('Arquivo de comprovantes contém caminho inesperado.')
  const types = await compose(s, ['run', '--rm', '--no-deps', '-T', '--user', '0', '--entrypoint', 'tar', 'api', '-tvzf', '-'], { stdinFile: join(source, 'comprovantes.tar.gz') })
  if (types.split('\n').some(line => line && !['-', 'd'].includes(line[0]!))) throw new Error('Links não são aceitos no arquivo de comprovantes.')
  await compose(s, ['run', '--rm', '--no-deps', '-T', '--user', '1000:1000', '--entrypoint', 'tar', 'api', '-C', '/app/armazenamento/comprovantes', '-xzf', '-', '--no-same-owner', '--no-same-permissions'], { stdinFile: join(source, 'comprovantes.tar.gz') })
  await compose(s, ['exec', '-T', 'postgres', 'sh', '-c', `exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "${manifest.database}" -c ANALYZE`])
  s.env.BACKEND_DB_NAME = manifest.database
  await compose(s, ['up', '-d', '--wait', 'api'])
}

export function assertInsideRoot(path: string): void {
  const rel = relative(root, resolve(path))
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Caminho precisa estar dentro do repositório.')
}
