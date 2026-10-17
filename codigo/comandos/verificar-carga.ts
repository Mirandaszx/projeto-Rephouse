import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
import {setTimeout as delay} from 'node:timers/promises'
import {root,stack,compose,command,type Stack} from './operacao-docker.js'
import {receiptFixture} from '../infraestrutura/banco/comprovante-fixture.js'

const profile=process.argv[2]??'curto'
if(!['curto','completo'].includes(profile))throw new Error('Use perfil curto ou completo.')
const suffix=randomBytes(6).toString('hex'),project=`rephouse-carga-${suffix}`
const directory=join(root,'.devops-local',`carga-${suffix}`)
let s:Stack|undefined,owned=false
try{
  await mkdir(directory,{recursive:true,mode:0o700})
  const password=randomBytes(24).toString('hex'),secret=randomBytes(32).toString('hex')
  const envFile=join(directory,'stack.env')
  await writeFile(envFile,`BACKEND_DB_USER=rephouse\nBACKEND_DB_NAME=rabbu_mvp_carga\nBACKEND_DB_PASSWORD=${password}\nBACKEND_DATABASE_URL=postgresql://rephouse:${password}@postgres:5432/rabbu_mvp_carga?schema=public\nBACKEND_JWT_SECRET=${secret}\nBACKEND_PORT=${process.env.CARGA_PORT??'3401'}\n`,{mode:0o600})
  s=await stack(project,envFile);s.args.push('-f','docker-compose.carga.yml')
  s.env.CARGA_DIR=directory.replaceAll('\\','/');s.env.CARGA_PERFIL=profile
  // No Linux, o k6 precisa ler/escrever os arquivos privados do operador (0700/0600).
  s.env.CARGA_UID=String(process.getuid?.()??1000);s.env.CARGA_GID=String(process.getgid?.()??1000)
  for(const kind of ['container','volume'])assert.equal(await command([kind,'ls',...(kind==='container'?['-a']:[]),'-q','--filter',`label=com.docker.compose.project=${project}`]),'')
  owned=true
  console.log(`Carga ${profile}: construindo imagens e iniciando projeto isolado.`)
  if(process.env.CARGA_SKIP_BUILD!=='1')await compose(s,['build','api','migracoes'])
  await compose(s,['up','-d','--wait','api'])
  const seed=JSON.parse(await compose(s,['exec','-T','-e','NODE_ENV=test','-e','CARGA_PERFIL','api','node','dist/comandos/semear-carga.js'])) as {actors:unknown[];expected:Record<string,number>}
  await writeFile(join(directory,'atores.json'),JSON.stringify(seed),{mode:0o600})
  await writeFile(join(directory,'comprovante.png'),receiptFixture(),{mode:0o600})
  const verify=async()=>JSON.parse(await compose(s!,['exec','-T','-e','NODE_ENV=test','-e','CARGA_ACAO=verificar','api','node','dist/comandos/semear-carga.js'])) as Record<string,number|string>
  const before=await verify()
  for(const [field,expected]of Object.entries(seed.expected))assert.equal(before[field],expected,field)
  console.log(`Base preparada: ${before.usuarios} contas, ${before.republicas} repúblicas, ${before.despesas} despesas, ${before.tarefas} tarefas.`)
  const ids=(await compose(s,['ps','-q','api','postgres'])).split(/\s+/).filter(Boolean)
  const limits=JSON.parse(await command(['inspect','--format','{{json .HostConfig}}',ids[0]!])) as {NanoCpus:number;Memory:number}
  assert.equal(limits.NanoCpus,2000000000)
  for(const [service,memory]of [['api',1073741824],['postgres',2147483648]] as const){
    const container=await compose(s,['ps','-q',service])
    const config=JSON.parse(await command(['inspect','--format','{{json .HostConfig}}',container])) as {NanoCpus:number;Memory:number}
    assert.equal(config.NanoCpus,2000000000);assert.equal(config.Memory,memory)
  }
  const samples:unknown[]=[]
  let monitoring=true
  const monitor=(async()=>{while(monitoring){try{const raw=await command(['stats','--no-stream','--format','{{json .}}',...ids]);samples.push({at:new Date().toISOString(),containers:raw.split('\n').filter(Boolean).map(line=>JSON.parse(line))})}catch{/* A falha é reportada pela execução principal. */}if(monitoring)await delay(10000)}})()
  let executionError=false
  try{await compose(s,['run','--rm','--no-deps','-T','k6'])}catch{executionError=true}
  finally{monitoring=false;await monitor}
  const summary=JSON.parse(await readFile(join(directory,'resumo-k6.json'),'utf8')) as {metrics:Record<string,{values:Record<string,number>;thresholds?:Record<string,{ok:boolean}>}>}
  const after=await verify()
  for(const field of ['saldosInvalidos','totaisInvalidos','contextosInvalidos','chavesDuplicadas','statusInvalidos','comprovantesInvalidos'])assert.equal(after[field],0,field)
  assert.equal(after.isolation,'serializable');assert.equal(after.sync,'on');assert.equal(after.fsync,'on');assert.equal(after.fullPageWrites,'on')
  for(const [field,expected]of Object.entries(seed.expected))assert.equal(after[field],expected,field)
  assert.equal(Number(after.pagamentos)-Number(before.pagamentos),summary.metrics.pagamentos_confirmados?.values.count??0,'Todo pagamento confirmado corresponde a uma única gravação.')
  assert.equal(Number(after.comprovantes)-Number(before.comprovantes),summary.metrics.pagamentos_confirmados?.values.count??0,'Todo upload confirmado possui um comprovante no banco.')
  const passed=!executionError&&Object.values(summary.metrics).every(metric=>Object.values(metric.thresholds??{}).every(threshold=>threshold.ok))
  const result={at:new Date().toISOString(),profile,result:passed?'passed':'target_not_met',resourceLimits:{api:{cpus:2,memoryGiB:1},postgres:{cpus:2,memoryGiB:2}},before,after,metrics:Object.fromEntries(Object.entries(summary.metrics).map(([name,metric])=>[name,{values:metric.values,thresholds:metric.thresholds}])),samples,remoteCI:'não executada; commits somente locais'}
  await writeFile(join(directory,'resultado.json'),JSON.stringify(result,null,2))
  console.log(`Resultado ${profile}: ${result.result}. Evidência: ${join(directory,'resultado.json')}`)
  if(!passed)process.exitCode=1
}catch(error){
  console.error(error instanceof Error?error.message:'Ensaio de carga falhou.')
  process.exitCode=1
}finally{
  if(s&&owned)try{await compose(s,['down','--volumes','--remove-orphans'])}catch{console.error(`Limpeza pendente: ${project}`);process.exitCode=1}
}
