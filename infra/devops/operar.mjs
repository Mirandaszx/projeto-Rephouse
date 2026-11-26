import { spawn } from 'node:child_process'
import { randomBytes, createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, readdir, open, unlink } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
process.chdir(root)
const local = resolve('.devops-local/devops')
const stateFile = resolve(local, 'credenciais.json')
const obs = 'rephouse-observabilidade', app = 'rephouse-demo'
const hex = () => randomBytes(32).toString('hex')
const safe = { ...process.env, RESEND_API_KEY: '', BREVO_API_KEY: '', EMAIL_FROM: '', APP_PUBLIC_URL: '', GOOGLE_CLIENT_ID: '' }
const bin = value => process.platform === 'win32' ? `${value}.exe` : value
async function run(program, args, { input, capture = false, allowFailure = false, env = {} } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(program === 'node' ? process.execPath : bin(program), args,
      { cwd: root, windowsHide: true, env: { ...safe, ...env }, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = '', err = ''
    child.stdout.on('data', b => { out += b; if (!capture) process.stdout.write(b) })
    child.stderr.on('data', b => { err += b; if (!capture) process.stderr.write(b) })
    child.on('error', reject)
    child.on('close', code => code === 0 || allowFailure ? resolveRun({ out, err, code })
      : reject(new Error(`${program} falhou (${code}). ${capture ? 'Consulte o estado dos recursos; dados sensíveis não foram impressos.' : ''}`)))
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}
const kube = (args, options) => run('kubectl', ['--context', 'docker-desktop', ...args], options)
async function context() {
  const config = JSON.parse((await kube(['config', 'view', '--minify', '-o', 'json'], { capture: true })).out)
  const host = new URL(config.clusters[0].cluster.server).hostname
  if (!['127.0.0.1', 'localhost', 'kubernetes.docker.internal'].includes(host)) throw new Error('Recusado: contexto não é local.')
  const nodes = JSON.parse((await kube(['get', 'nodes', '-o', 'json'], { capture: true })).out).items
  if (nodes.length !== 1) throw new Error('Esta demonstração exige exatamente um nó local.')
  for (const namespace of [app, obs]) {
    const result = await kube(['get', 'namespace', namespace, '-o', 'json', '--ignore-not-found'], { capture: true })
    if (result.out.trim() && JSON.parse(result.out).metadata.labels?.['app.kubernetes.io/part-of'] !== 'rephouse-devops-local') {
      throw new Error('Namespace preexistente não pertence à demonstração. Nenhum recurso será substituído.')
    }
  }
  return nodes
}
async function prepare() {
  await mkdir(local, { recursive: true })
  let state
  try { state = JSON.parse(await readFile(stateFile, 'utf8')) }
  catch (error) {
    if (error.code !== 'ENOENT') throw error
    state = { database: 'rephouse_devops_demo', adminPassword: hex(), runtimePassword: hex(), jwt: hex(),
      demoPassword: hex().slice(0, 24), elasticPassword: hex(), kibanaPassword: hex(), encryptionKey: hex(),
      observerPassword: hex(), createdAt: new Date().toISOString() }
    await writeFile(stateFile, JSON.stringify(state, null, 2), { flag: 'wx', mode: 0o600 })
  }
  if (state.database !== 'rephouse_devops_demo' || !/^[a-f0-9]{64}$/.test(state.adminPassword)
    || !/^[a-f0-9]{64}$/.test(state.runtimePassword)) throw new Error('Estado local inválido; não será sobrescrito.')
  return state
}
async function sourceTag() {
  const digest = createHash('sha256')
  async function walk(directory) {
    for (const item of (await readdir(directory, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      if (['node_modules','dist','gerado','.git'].includes(item.name) || item.name.startsWith('.env') || item.name.endsWith('.tsbuildinfo')) continue
      const path = `${directory}/${item.name}`
      if (item.isDirectory()) await walk(path)
      else if (item.isFile()) { digest.update(path); digest.update(await readFile(path)) }
    }
  }
  for (const directory of ['codigo','prisma','interface/codigo','interface/publico','integracao','infra/devops']) await walk(directory)
  for (const path of ['Dockerfile','package.json','package-lock.json','tsconfig.json','prisma.config.ts','interface/package.json','interface/package-lock.json','interface/index.html','interface/vite.config.ts','interface/tsconfig.app.json']) {
    digest.update(path); digest.update(await readFile(path))
  }
  const commit = (await run('git', ['rev-parse','--short=8','HEAD'], { capture: true })).out.trim()
  return `4.2.0-${commit}-${digest.digest('hex').slice(0, 12)}`
}
async function build() {
  const tag = await sourceTag()
  // Data do dia: refaz só a camada de atualizações de segurança (apt/apk upgrade), nunca o cache inteiro.
  const atualizacoes = ['--build-arg', `ATUALIZACOES_SEGURANCA=${new Date().toISOString().slice(0, 10)}`]
  for (const target of ['runtime','migracoes']) await run('docker', ['build',...atualizacoes,'--target',target,'-t',`rephouse-${target === 'runtime' ? 'api' : 'migracoes'}:${tag}`,'.'])
  await run('docker', ['build',...atualizacoes,'-f','infra/devops/Dockerfile.frontend','-t',`rephouse-frontend:${tag}`,'.'])
  const images = []
  for (const name of ['api','migracoes','frontend']) {
    const image = `rephouse-${name}:${tag}`
    const info = JSON.parse((await run('docker',['image','inspect',image],{capture:true})).out)[0]
    if (!info.Config.User || ['0','root','0:0'].includes(info.Config.User)) throw new Error('Imagem sem usuário limitado.')
    images.push({ name, image, id: info.Id, user: info.Config.User })
  }
  await writeFile(resolve(local,'imagens.json'), JSON.stringify({ tag, images, builtAt:new Date().toISOString() },null,2))
  console.log('Imagens compiladas e usuários limitados conferidos. Nenhuma publicação realizada.')
}
async function secret(namespace, name, values) {
  const data=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,Buffer.from(value).toString('base64')]))
  await kube(['apply','--server-side','--field-manager=rephouse-devops-local','-f','-'], {capture:true,input:JSON.stringify({apiVersion:'v1',kind:'Secret',metadata:{name,namespace},type:'Opaque',data})})
  // Não manter uma segunda cópia dos valores na annotation do client-side apply.
  await kube(['-n',namespace,'annotate',`secret/${name}`,'kubectl.kubernetes.io/last-applied-configuration-'],{capture:true})
}
async function forward(namespace, service, remotePort) {
  const child = spawn(bin('kubectl'),['--context','docker-desktop','-n',namespace,'port-forward',`service/${service}`,`0:${remotePort}`,'--address','127.0.0.1'],{windowsHide:true,stdio:['ignore','pipe','pipe']})
  const port = await new Promise((resolvePort,reject) => {
    const timer=setTimeout(()=>{child.kill();reject(new Error('Timeout de port-forward.'))},30000)
    child.stdout.on('data',b=>{const match=String(b).match(/127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timer);resolvePort(Number(match[1]))}})
    child.once('error',reject);child.once('exit',()=>{clearTimeout(timer);reject(new Error('Port-forward encerrado.'))})
    child.stderr.on('data',()=>{})
  })
  return {port,close:()=>child.kill()}
}
async function elastic(state, port, path, method='GET', body) {
  const ca = await readFile(resolve(local,'certs/ca.crt'))
  return new Promise((resolveRequest,reject)=>{
    const request=https.request({hostname:'127.0.0.1',port,path,method,ca,auth:`elastic:${state.elasticPassword}`,
      headers:{'content-type':'application/json'},timeout:15000},response=>{
      let data='';response.on('data',b=>{data+=b});response.on('end',()=>{
        if(response.statusCode>=200&&response.statusCode<300)resolveRequest(data?JSON.parse(data):{})
        else reject(new Error(`Elasticsearch recusou configuração (${response.statusCode}).`))
      })
    });request.on('timeout',()=>request.destroy(new Error('Elasticsearch timeout.')));request.on('error',reject)
    request.end(body===undefined?undefined:JSON.stringify(body))
  })
}
async function bootstrapElastic(state) {
  const f=await forward(obs,'elasticsearch',9200)
  try {
    await elastic(state,f.port,'/_security/user/kibana_system/_password','POST',{password:state.kibanaPassword})
    await elastic(state,f.port,'/_ilm/policy/rephouse-seven-days','PUT',{policy:{phases:{delete:{min_age:'7d',actions:{delete:{}}}}}})
    await elastic(state,f.port,'/_index_template/rephouse-api','PUT',{
      index_patterns:['rephouse-api-*'],priority:200,template:{settings:{number_of_shards:1,number_of_replicas:0,'index.lifecycle.name':'rephouse-seven-days'},
        mappings:{properties:{'@timestamp':{type:'date'},timestamp:{type:'date'},event:{type:'keyword'},requestId:{type:'keyword'},method:{type:'keyword'},path:{type:'keyword'},status:{type:'integer'},durationMs:{type:'double'},code:{type:'keyword'},category:{type:'keyword'},'log.level':{type:'keyword'},'service.name':{type:'keyword'},'service.version':{type:'keyword'},'service.environment':{type:'keyword'},
          memoryRssMb:{type:'double'},heapUsedMb:{type:'double'},eventLoopUtilization:{type:'double'},eventLoopDelayP99Ms:{type:'double'}}}}})
    await elastic(state,f.port,'/_security/role/rephouse_reader','PUT',{cluster:[],indices:[{names:['rephouse-api-*'],privileges:['read','view_index_metadata']}]})
    await elastic(state,f.port,'/_security/user/demo_observer','PUT',{password:state.observerPassword,roles:['kibana_admin','rephouse_reader'],full_name:'Operador da demonstração local'})
    if(!state.filebeatApiKey){
      const key=await elastic(state,f.port,'/_security/api_key','POST',{name:'rephouse-filebeat-local',role_descriptors:{writer:{cluster:['monitor'],indices:[{names:['rephouse-api-*'],privileges:['auto_configure','create_doc']}]}}})
      state.filebeatApiKey=`${key.id}:${key.api_key}`
      await writeFile(stateFile,JSON.stringify(state,null,2),{mode:0o600})
    }
    await secret(obs,'filebeat-writer',{apiKey:state.filebeatApiKey})
  } finally {f.close()}
}
async function deploy() {
  await context()
  const state=await prepare(), manifest=JSON.parse(await readFile(resolve(local,'imagens.json'),'utf8'))
  // IfNotPresent permite ao espelho integrado do Docker Desktop obter as imagens
  // construídas localmente, inclusive no provisionador Kind, sem registry público.
  await kube(['apply','-f','infra/devops/kubernetes/namespaces.yaml'])
  const adminUrl=`postgresql://rephouse_demo_admin:${state.adminPassword}@postgres.rephouse-demo.svc.cluster.local:5432/rephouse_devops_demo?schema=public`
  await secret(app,'database-admin',{POSTGRES_PASSWORD:state.adminPassword,DATABASE_URL:adminUrl,DEMO_RUNTIME_PASSWORD:state.runtimePassword,DEMO_PASSWORD:state.demoPassword})
  await secret(obs,'elastic-admin',{password:state.elasticPassword})
  await secret(obs,'kibana-runtime',{password:state.kibanaPassword,encryptionKey:state.encryptionKey})
  const certDir=resolve(local,'certs');await mkdir(certDir,{recursive:true})
  try {await readFile(resolve(certDir,'ca.crt'))} catch(error){if(error.code!=='ENOENT')throw error
    // A imagem da API é distroless (sem openssl); o certificado é gerado com a imagem de migrations, que é Debian completa.
    await run('docker',['run','--rm','--network','none','--user','1000:1000','-v',`${certDir}:/certs`,manifest.images.find(x=>x.name==='migracoes').image,
      'openssl','req','-x509','-newkey','rsa:3072','-nodes','-keyout','/certs/server.key','-out','/certs/ca.crt','-days','90','-subj','/CN=elasticsearch',
      '-addext','subjectAltName=DNS:elasticsearch,DNS:elasticsearch.rephouse-observabilidade.svc.cluster.local,DNS:localhost,IP:127.0.0.1'],{capture:true})}
  const certificate=await readFile(resolve(certDir,'ca.crt'),'utf8')
  await secret(obs,'elastic-tls',{'ca.crt':certificate,'server.key':await readFile(resolve(certDir,'server.key'),'utf8')})
  await secret(obs,'elastic-tls-public',{'ca.crt':certificate})
  let yaml=(await kube(['kustomize','infra/devops'],{capture:true})).out
  for(const image of manifest.images)yaml=yaml.replaceAll(`image: rephouse-${image.name}:local`,`image: ${image.image}`)
  await kube(['apply','-f','-'],{input:yaml})
  await kube(['-n',app,'rollout','status','statefulset/postgres','--timeout=240s'])
  const jobName=`preparar-${Date.now()}`
  await kube(['apply','-f','-'],{input:JSON.stringify({apiVersion:'batch/v1',kind:'Job',metadata:{name:jobName,namespace:app},spec:{backoffLimit:0,ttlSecondsAfterFinished:86400,template:{metadata:{labels:{app:'preparar-demo'}},spec:{restartPolicy:'Never',automountServiceAccountToken:false,
    securityContext:{runAsNonRoot:true,runAsUser:1000,runAsGroup:1000,seccompProfile:{type:'RuntimeDefault'}},
    initContainers:[{name:'migracoes',image:manifest.images.find(x=>x.name==='migracoes').image,imagePullPolicy:'IfNotPresent',command:['node','node_modules/prisma/build/index.js','migrate','deploy'],
      env:[{name:'NODE_ENV',value:'development'},{name:'DATABASE_URL',valueFrom:{secretKeyRef:{name:'database-admin',key:'DATABASE_URL'}}}],
      securityContext:{allowPrivilegeEscalation:false,capabilities:{drop:['ALL']}},resources:{requests:{memory:'128Mi',cpu:'100m'},limits:{memory:'512Mi',cpu:'1'}}}],
    containers:[{name:'permissoes-e-demo',image:manifest.images.find(x=>x.name==='api').image,imagePullPolicy:'IfNotPresent',command:['/nodejs/bin/node','dist/comandos/preparar-demo-kubernetes.js'],
      envFrom:[{secretRef:{name:'database-admin'}}],env:[{name:'NODE_ENV',value:'development'},{name:'REPHOUSE_DEMO_CONTEXT',value:'kubernetes-local'}],
      securityContext:{allowPrivilegeEscalation:false,capabilities:{drop:['ALL']}},resources:{requests:{memory:'128Mi',cpu:'100m'},limits:{memory:'512Mi',cpu:'1'}}}]}}}})})
  await kube(['-n',app,'wait',`job/${jobName}`,'--for=condition=complete','--timeout=240s'])
  await secret(app,'api-runtime',{DATABASE_URL:`postgresql://rephouse_demo_api:${state.runtimePassword}@postgres.rephouse-demo.svc.cluster.local:5432/rephouse_devops_demo?schema=public`,JWT_SECRET:state.jwt})
  await kube(['-n',obs,'rollout','status','statefulset/elasticsearch','--timeout=480s'])
  await bootstrapElastic(state)
  await kube(['-n',obs,'patch','daemonset','filebeat','--type=merge','-p',JSON.stringify({spec:{template:{spec:{nodeSelector:null}}}})])
  // O ConfigMap usa subPath: reiniciar o coletor para aplicar configuração/credencial.
  await kube(['-n',obs,'rollout','restart','daemonset/filebeat'])
  for(const [ns,object]of [[app,'deployment/api'],[app,'deployment/frontend'],[obs,'deployment/kibana'],[obs,'daemonset/filebeat']])await kube(['-n',ns,'rollout','status',object,'--timeout=600s'])
  await dashboard(state)
  console.log('Demonstração implantada. Execute: node infra/devops/operar.mjs acessar')
}
async function dashboard(state) {
  const f=await forward(obs,'kibana',5601)
  try {
    const content=await readFile('infra/devops/kibana.ndjson')
    const form=new FormData();form.append('file',new Blob([content],{type:'application/ndjson'}),'rephouse.ndjson')
    const response=await fetch(`http://127.0.0.1:${f.port}/api/saved_objects/_import?overwrite=true`,{method:'POST',headers:{authorization:`Basic ${Buffer.from(`demo_observer:${state.observerPassword}`).toString('base64')}`,'kbn-xsrf':'true'},body:form})
    if(!response.ok || !(await response.json()).success)throw new Error('Importação do dashboard não confirmada.')
    // Alerta de pico de 5xx. Na licença Basic, o conector disponível sem custo é o log do próprio Kibana.
    // IDs fixos: reimplantar não duplica (409 = já existe).
    const kibana=(path,body)=>fetch(`http://127.0.0.1:${f.port}${path}`,{method:'POST',body:JSON.stringify(body),
      headers:{authorization:`Basic ${Buffer.from(`demo_observer:${state.observerPassword}`).toString('base64')}`,'kbn-xsrf':'true','content-type':'application/json'}})
    const conector=await kibana('/api/actions/connector/rephouse-log-kibana',{name:'Log do Kibana (demo)',connector_type_id:'.server-log',config:{},secrets:{}})
    if(!conector.ok&&conector.status!==409)throw new Error(`Conector de alerta não criado (${conector.status}).`)
    const regra=await kibana('/api/alerting/rule/rephouse-picos-5xx',{name:'RepHouse: pico de respostas 5xx',rule_type_id:'.index-threshold',consumer:'stackAlerts',
      schedule:{interval:'1m'},tags:['rephouse','demo-local'],
      params:{index:['rephouse-api-*'],timeField:'@timestamp',aggType:'count',groupBy:'all',thresholdComparator:'>',threshold:[5],timeWindowSize:5,timeWindowUnit:'m',filterKuery:'event: http AND status >= 500'},
      actions:[{id:'rephouse-log-kibana',group:'threshold met',params:{level:'warn',message:'RepHouse: mais de 5 respostas 5xx em 5 minutos. {{context.message}}'},
        frequency:{summary:false,notify_when:'onActionGroupChange',throttle:null}}]})
    if(!regra.ok&&regra.status!==409)throw new Error(`Regra de alerta não criada (${regra.status}).`)
  }finally{f.close()}
}
async function access() {
  await context()
  console.log('RepHouse: http://localhost:5180/login\nKibana: http://localhost:5601\nCredenciais exclusivas: .devops-local/devops/credenciais.json (não compartilhar). Ctrl+C encerra somente os acessos.')
  const children=[[app,'frontend','5180:8080'],[obs,'kibana','5601:5601']].map(([ns,service,ports])=>spawn(bin('kubectl'),['--context','docker-desktop','-n',ns,'port-forward',`service/${service}`,ports,'--address','127.0.0.1'],{windowsHide:true,stdio:'inherit'}))
  const stop=()=>{for(const child of children)child.kill()}
  process.once('SIGINT',stop);process.once('SIGTERM',stop)
  await Promise.all(children.map(child=>new Promise(resolveExit=>child.on('exit',()=>{stop();resolveExit()}))))
}
async function main() {
  const action=process.argv[2]
  if(!['preparar','build','implantar','acessar','status','parar','dashboard'].includes(action))throw new Error('Use preparar, build, implantar, acessar, status, parar ou dashboard.')
  if(action==='preparar'){await prepare();console.log('Credenciais locais preparadas; .env principal não foi acessado.');return}
  if(action==='acessar'){await access();return}
  await prepare()
  const lock=resolve(local,'operacao.lock');const handle=await open(lock,'wx').catch(()=>{throw new Error('Já existe uma operação; confira operacao.lock antes de repetir.')})
  try {
    if(action==='build')await build()
    if(action==='implantar')await deploy()
    if(action==='dashboard'){await context();await dashboard(await prepare())}
    if(action==='status'){await context();for(const ns of [app,obs])await kube(['-n',ns,'get','pods,svc,pvc'])}
    if(action==='parar'){
      await context()
      for(const [ns,kind]of [[app,'deployment'],[app,'statefulset'],[obs,'deployment'],[obs,'statefulset']])await kube(['-n',ns,'scale',kind,'--all','--replicas=0'])
      await kube(['-n',obs,'patch','daemonset','filebeat','--type=merge','-p',JSON.stringify({spec:{template:{spec:{nodeSelector:{'rephouse.devops/paused':'true'}}}}})])
      console.log('Somente a demonstração foi parada; PVCs e ambientes existentes preservados.')
    }
  }finally{await handle.close();await unlink(lock)}
}
export { context, forward, elastic, prepare, kube, run }
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  void main().catch(error=>{console.error(error.message);process.exitCode=1})
}
