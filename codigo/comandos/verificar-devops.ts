import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdir, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { command, compose, stack, backup, restore, root, assertInsideRoot, type Stack } from './operacao-docker.js'

// Credenciais descartáveis, novas por execução; nenhum segredo real do .env é usado.
const suffix = randomBytes(6).toString('hex')
const project = `rephouse-auditoria-${suffix}`
const restoredProject = `rephouse-restauracao-${suffix}`
const directory = join(root, '.devops-local', suffix)
const envFile = join(directory, 'stack.env')
const password = randomBytes(24).toString('hex')
const secret = randomBytes(32).toString('hex')
const senha = `Auditoria-${randomBytes(16).toString('hex')}`
const port = process.env.DEVOPS_PORT ?? '3301'
const restorePort = process.env.DEVOPS_RESTORE_PORT ?? '3302'
const events: string[] = []
const ownedProjects = new Set<string>()
function evidence(message: string) { events.push(message); console.log(message) }
let source: Stack | undefined, target: Stack | undefined

async function reserve(s: Stack) {
  for (const kind of ['container','volume']) {
    assert.equal(await command([kind,'ls',...(kind==='container'?['-a']:[]),'-q','--filter',`label=com.docker.compose.project=${s.project}`]),'','Projeto de auditoria deve ser novo.')
  }
  ownedProjects.add(s.project)
}

async function ready(base: string) {
  for (let attempt=0; attempt<40; attempt++) {
    try { if ((await fetch(`${base}/api/ready`,{signal:AbortSignal.timeout(2000)})).ok) return } catch { /* Aguarda startup. */ }
    await delay(500)
  }
  throw new Error('Readiness não ficou disponível.')
}
const snapshotSql = `SELECT json_build_object(
 'usuarios',(SELECT count(*) FROM usuarios), 'republicas',(SELECT count(*) FROM republicas),
 'membros',(SELECT count(*) FROM membros_republica), 'despesas',(SELECT count(*) FROM despesas),
 'rateios',(SELECT count(*) FROM rateios_despesa), 'pagamentos',(SELECT count(*) FROM pagamentos),
 'tarefas',(SELECT count(*) FROM tarefas), 'versoes',(SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL),
 'vinculosInativos',(SELECT count(*) FROM membros_republica WHERE NOT ativo),
 'extensaoCrypto',(SELECT count(*) FROM pg_extension WHERE extname='pgcrypto'),
 'pago',(SELECT sum(valor) FROM pagamentos),
 'saldosInvalidos',(SELECT count(*) FROM rateios_despesa r WHERE valor_pago <> (SELECT coalesce(sum(valor),0) FROM pagamentos p WHERE p.rateio_id=r.id) OR valor_pago>valor_devido),
 'totaisInvalidos',(SELECT count(*) FROM despesas d WHERE valor_total <> (SELECT sum(valor_devido) FROM rateios_despesa r WHERE r.despesa_id=d.id)),
 'isolation',current_setting('default_transaction_isolation'),'sync',current_setting('synchronous_commit'),
 'fsync',current_setting('fsync'),'fullPageWrites',current_setting('full_page_writes'),
 'triggers',(SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal),
 'unlogged',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relpersistence<>'p'))` 
async function snapshot(s: Stack): Promise<Record<string, unknown>> {
  return JSON.parse(await compose(s,['exec','-T','postgres','sh','-c','exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d rabbu_mvp -At'],{input:snapshotSql})) as Record<string, unknown>
}
async function fixture(base: string) {
  const paymentKey=randomUUID()
  async function request(method: string, path: string, token?: string, data?: unknown) {
    const form = data instanceof FormData
    const result = await fetch(`${base}${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(!form&&data?{'Content-Type':'application/json'}:{}),...(path==='/api/pagamentos'?{'Idempotency-Key':paymentKey}: {})},body:data?form?data:JSON.stringify(data):undefined})
    assert.ok(result.ok, `${method} ${path}: ${result.status}`)
    return await result.json() as Record<string, unknown>
  }
  const session = await request('POST','/api/auth/register',undefined,{nome:'Auditoria Docker',email:'docker@audit.example.test',senha})
  const token = session.token as string
  await request('POST','/api/republicas',token,{nome:'República Docker'})
  const membersRes = await fetch(`${base}/api/membros`,{headers:{Authorization:`Bearer ${token}`}})
  assert.equal(membersRes.status,200)
  const members = (await membersRes.json() as {dados:{id:string}[]}).dados
  const expense = await request('POST','/api/despesas',token,{titulo:'Conta preservada',categoria:'OUTROS',valorTotal:'120.00',vencimento:'2030-01-01',membroIds:[members[0]!.id]})
  const rateio = (expense.rateios as {id:string}[])[0]!
  const content = '%PDF-1.4\nComprovante privado da auditoria Docker\n%%EOF'
  const data = new FormData()
  data.set('rateioId',rateio.id); data.set('valor','40.00')
  data.set('comprovante',new Blob([content],{type:'application/pdf'}),'conta.pdf')
  const payment = await request('POST','/api/pagamentos',token,data)
  return { token, paymentId: payment.id as string, rateioId: rateio.id, hash:createHash('sha256').update(content).digest('hex'),paymentKey,content }
}
async function verifyReceipt(base: string, token: string, paymentId: string, hash: string) {
  const path = `${base}/api/pagamentos/${paymentId}/comprovante`
  assert.equal((await fetch(path)).status,401)
  const result = await fetch(path,{headers:{Authorization:`Bearer ${token}`}})
  assert.equal(result.status,200)
  assert.equal(createHash('sha256').update(Buffer.from(await result.arrayBuffer())).digest('hex'),hash)
}

try {
  assertInsideRoot(directory)
  await mkdir(directory,{recursive:true})
  await writeFile(envFile,`BACKEND_DB_USER=rephouse\nBACKEND_DB_NAME=rabbu_mvp\nBACKEND_DB_PASSWORD=${password}\nBACKEND_DATABASE_URL=postgresql://rephouse:${password}@postgres:5432/rabbu_mvp?schema=public\nBACKEND_JWT_SECRET=${secret}\nBACKEND_PORT=${port}\n`,{mode:0o600})
  source = await stack(project,envFile)
  await reserve(source)
  if (process.env.DEVOPS_SKIP_BUILD !== '1') {
    evidence('Construindo imagens de runtime e migrations a partir do lockfile.')
    await compose(source,['build'])
  }
  await compose(source,['up','-d','--wait','api'])
  const base = `http://127.0.0.1:${port}`
  await ready(base)
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(),{status:'ok'})
  const uid = await compose(source,['exec','-T','api','id','-u'])
  assert.equal(uid,'1000')
  const mountIds = await compose(source,['ps','-q','api'])
  const mounts = JSON.parse(await command(['inspect','--format','{{json .Mounts}}',mountIds])) as {Type:string}[]
  assert.ok(mounts.every(mount=>mount.Type==='volume'))
  // Exercita backup dos três perfis, vínculos históricos e tarefas, além do comprovante.
  source.env.DEMO_PASSWORD=senha
  await compose(source,['exec','-T','-e','NODE_ENV=test','-e','DEMO_PASSWORD','api','node','dist/comandos/semear-demonstracao.js'])
  const data = await fixture(base)
  await verifyReceipt(base,data.token,data.paymentId,data.hash)
  const before = await snapshot(source)
  assert.equal(before.isolation,'serializable'); assert.equal(before.sync,'on')
  assert.equal(before.fsync,'on'); assert.equal(before.fullPageWrites,'on')
  assert.equal(before.unlogged,0); assert.equal(before.saldosInvalidos,0); assert.equal(before.totaisInvalidos,0)
  assert.equal(before.pago,140); assert.equal(before.versoes,(await readdir('prisma/migracoes')).filter(name=>/^\d/.test(name)).length); assert.ok(Number(before.triggers)>0)
  assert.equal(before.vinculosInativos,1); assert.equal(before.tarefas,3)
  await compose(source,['restart','postgres','api'])
  await ready(base)
  assert.deepEqual(await snapshot(source),before)
  await verifyReceipt(base,data.token,data.paymentId,data.hash)
  const replay=new FormData();replay.set('rateioId',data.rateioId);replay.set('valor','40.00');replay.set('comprovante',new Blob([data.content],{type:'application/pdf'}),'conta.pdf')
  const replayResponse=await fetch(`${base}/api/pagamentos`,{method:'POST',headers:{Authorization:`Bearer ${data.token}`,'Idempotency-Key':data.paymentKey},body:replay})
  assert.equal(replayResponse.status,201);assert.equal((await replayResponse.json() as {id:string}).id,data.paymentId)
  assert.deepEqual(await snapshot(source),before)
  // Mantém uma requisição real aguardando PostgreSQL durante SIGTERM.
  const sql=(input:string)=>compose(source!,['exec','-T','postgres','sh','-c','exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'],{input})
  const hold=sql('BEGIN; LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE; SELECT pg_sleep(8); COMMIT;')
  let inFlight:Promise<Response>|undefined
  try{
    let locked=false
    for(let attempt=0;attempt<20;attempt++){
      if(await sql("SELECT count(*) FROM pg_locks l JOIN pg_class c ON c.oid=l.relation WHERE c.relname='usuarios' AND mode='AccessExclusiveLock' AND granted;")==='1'){locked=true;break}
      await delay(50)
    }
    assert.ok(locked,'Trava de teste precisa estar ativa antes do SIGTERM.')
    const form=new FormData();form.set('rateioId',data.rateioId);form.set('valor','40.00');form.set('comprovante',new Blob([data.content],{type:'application/pdf'}),'conta.pdf')
    inFlight=fetch(`${base}/api/pagamentos`,{method:'POST',headers:{Authorization:`Bearer ${data.token}`,'Idempotency-Key':data.paymentKey},body:form})
    let waiting=false
    for(let attempt=0;attempt<20;attempt++){
      if(Number(await sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%usuarios%';"))>0){waiting=true;break}
      await delay(50)
    }
    assert.ok(waiting,'Requisição deve estar em andamento antes de parar a API.')
    const stopping=compose(source,['stop','-t','20','api'])
    const completed=await inFlight
    assert.equal(completed.status,201);assert.equal((await completed.json() as {id:string}).id,data.paymentId)
    await stopping
  }finally{await hold;await inFlight?.catch(()=>{})}
  await compose(source,['start','api']);await ready(base)
  assert.deepEqual(await snapshot(source),before)
  evidence('SIGTERM drenou requisição em andamento; replay após reinício preservou o mesmo pagamento sem duplicação.')
  evidence(`Imagem compilada sem bind mount, usuário 1000, ${before.versoes} migrations, registros e comprovante preservados após restart.`)

  await compose(source,['stop','postgres'])
  const start = performance.now()
  assert.equal((await fetch(`${base}/api/ready`)).status,503)
  assert.ok(performance.now()-start<2000)
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(),{status:'ok'})
  await compose(source,['start','postgres']); await ready(base)
  evidence('Banco desligado: readiness 503 em menos de dois segundos; health 200; recuperação automática após retorno.')
  const logs = await compose(source,['logs','--no-log-prefix','api'])
  for (const privateValue of [password,secret,senha,data.token,'Comprovante privado']) assert.ok(!logs.includes(privateValue))
  const httpLogs = logs.split('\n').filter(line=>line.startsWith('{')).map(line=>JSON.parse(line) as Record<string,unknown>).filter(event=>event.event==='http')
  assert.ok(httpLogs.length>0 && httpLogs.every(event=>event.requestId&&typeof event.durationMs==='number'))
  evidence('Logs JSON correlacionados por requestId sem senha, token, DSN ou conteúdo do comprovante.')

  // Falha após a parada real da API: verifica trava concorrente e recuperação no finally.
  let releaseCapture!:()=>void,notifyCapture!:()=>void
  const captureGate=new Promise<void>(resolve=>{releaseCapture=resolve})
  const captureStarted=new Promise<void>(resolve=>{notifyCapture=resolve})
  const failedCapture=backup(source,async(selected,args,opts)=>{
    if(opts?.output?.endsWith('banco.dump')){
      notifyCapture();await captureGate
      throw new Error('Falha de captura deliberada para validar recuperação.')
    }
    return compose(selected,args,opts)
  })
  try{
    await Promise.race([captureStarted,failedCapture])
    await assert.rejects(backup(source),/Já existe uma operação/)
  }finally{releaseCapture()}
  await assert.rejects(failedCapture,/Falha de captura deliberada/)
  await ready(base)
  await verifyReceipt(base,data.token,data.paymentId,data.hash)
  assert.deepEqual(await snapshot(source),before)
  evidence('Backup concorrente recusado; falha de captura após parada real reiniciou a API e preservou banco/comprovante.')

  const backupDir = await backup(source)
  await ready(base)
  target = await stack(restoredProject,envFile)
  await reserve(target)
  target.env.BACKEND_PORT = restorePort
  await restore(target,backupDir)
  const restoredBase = `http://127.0.0.1:${restorePort}`
  await ready(restoredBase)
  assert.deepEqual(await snapshot(target),before)
  const login = await fetch(`${restoredBase}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'docker@audit.example.test',senha})})
  assert.equal(login.status,200)
  const restoredToken = (await login.json() as {token:string}).token
  await verifyReceipt(restoredBase,restoredToken,data.paymentId,data.hash)
  // A regra restaurada deve recusar excesso, mantendo o acumulado original.
  const overpay = await fetch(`${restoredBase}/api/pagamentos`,{method:'POST',headers:{Authorization:`Bearer ${restoredToken}`,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify({rateioId:data.rateioId,valor:'80.01'})})
  assert.equal(overpay.status,409)
  await assert.rejects(compose(target,['exec','-T','postgres','sh','-c','exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d rabbu_mvp -At'],{input:`INSERT INTO pagamentos (rateio_id,membro_id,valor) SELECT id,membro_id,80.01 FROM rateios_despesa WHERE id='${data.rateioId}';`}))
  assert.deepEqual(await snapshot(target),before)
  await assert.rejects(restore(target,backupDir),/Destino já possui recursos/)
  evidence('Backup customizado e comprovantes restaurados em cluster/volumes novos: registros, triggers, ACID, login, download e bloqueio de sobrepagamento conferidos.')
  await writeFile(join(directory,'resultado.json'),JSON.stringify({at:new Date().toISOString(),result:'passed',events,snapshot:before,backup:backupDir,remoteCI:'não executada'},null,2))
  console.log(`Evidência local: ${join(directory,'resultado.json')}`)
} catch(error) {
  console.error(error instanceof Error ? error.message : 'Validação DevOps falhou.')
  process.exitCode=1
} finally {
  // A limpeza alcança apenas os dois projetos aleatórios criados por este comando.
  for (const s of [target,source]) if (s && ownedProjects.has(s.project)) {
    try { await compose(s,['down','--volumes','--remove-orphans']) } catch { console.error(`Limpeza pendente do projeto ${s.project}.`); process.exitCode=1 }
  }
}
