import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

const require=createRequire(import.meta.url)
const sharp=require('sharp'), {chromium}=require('../../interface/node_modules/playwright')
const local='.devops-local/devops', base='http://127.0.0.1:5180', checks=[]
const state=JSON.parse(await readFile(`${local}/credenciais.json`,'utf8'))
assert.equal(state.database,'rephouse_devops_demo')
const run=(args)=>{
  const result=spawnSync(process.platform==='win32'?'kubectl.exe':'kubectl',['--context','docker-desktop',...args],{encoding:'utf8',windowsHide:true})
  if(result.status!==0)throw new Error('kubectl recusou a verificação local.')
  return result.stdout
}
const context=JSON.parse(run(['config','view','--minify','-o','json']))
assert.ok(['127.0.0.1','localhost','kubernetes.docker.internal'].includes(new URL(context.clusters[0].cluster.server).hostname))
for(const ns of ['rephouse-demo','rephouse-observabilidade'])assert.equal(JSON.parse(run(['get','namespace',ns,'-o','json'])).metadata.labels['app.kubernetes.io/part-of'],'rephouse-devops-local')
async function check(name,fn){await fn();checks.push({name,passed:true});console.log(`OK: ${name}`)}
async function api(path,{token,body,method='GET',key}={}){
  const headers={Origin:base,...(token?{Authorization:`Bearer ${token}`}:{})}
  if(key)headers['Idempotency-Key']=key
  if(body!==undefined&&!(body instanceof FormData))headers['Content-Type']='application/json'
  return fetch(`${base}/api${path}`,{method,headers,body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(20000)})
}
async function login(email){const r=await api('/auth/login',{method:'POST',body:{email,senha:state.demoPassword}});assert.equal(r.status,200);return r.json()}
let browser
try{
  await mkdir(`${local}/capturas`,{recursive:true})
  let admin,ana
  await check('SPA compilada e login real pelo Nginx',async()=>{
    const r=await fetch(`${base}/republica/perfil`);assert.equal(r.status,200);const html=await r.text()
    assert.match(html,/\/assets\//);assert.doesNotMatch(html,/@vite\/client|\/codigo\/main/)
    // Ensaios gravam na República Horizonte: a vitrine (Jardim) e a Aurora ficam sem dados de teste.
    admin=await login('admin.horizonte@demo.rephouse.test');ana=await login('bruno@demo.rephouse.test')
    assert.equal((await api('/me',{token:admin.token})).status,200)
  })
  let image,paymentId,taskId
  await check('Sharp e foto privada pelo proxy multipart',async()=>{
    image=await sharp({create:{width:120,height:120,channels:3,background:'#205448'}}).png().toBuffer()
    const form=new FormData();form.set('imagem',new Blob([image],{type:'image/png'}),'demo.png');form.set('recorte',JSON.stringify({x:0,y:0,largura:120,altura:120}))
    assert.equal((await api('/me/foto',{token:admin.token,method:'POST',body:form})).status,200)
    const own=await api(`/usuarios/${admin.usuario.id}/foto`,{token:admin.token});assert.equal(own.status,200);assert.match(own.headers.get('content-type'),/image\/webp/)
    const metadata=await sharp(Buffer.from(await own.arrayBuffer())).metadata();assert.equal(metadata.width,512);assert.equal(metadata.height,512)
    assert.equal((await api(`/usuarios/${admin.usuario.id}/foto`)).status,401)
  })
  await check('Pagamento manual, comprovante e download pelo proxy',async()=>{
    const members=await(await api('/membros',{token:admin.token})).json();const member=members.find(x=>x.usuarioId===ana.usuario.id)
    assert.ok(member)
    const expense=await api('/despesas',{token:admin.token,method:'POST',key:randomUUID(),body:{titulo:'Ensaio DevOps — comprovante',categoria:'OUTROS',valorTotal:'3.00',vencimento:'2026-12-01',membroIds:[member.id]}})
    assert.equal(expense.status,201);const data=await expense.json()
    const form=new FormData();form.set('rateioId',data.rateios[0].id);form.set('valor','1.00');form.set('comprovante',new Blob([image],{type:'image/png'}),'comprovante-demo.png')
    const paid=await api('/pagamentos',{token:ana.token,method:'POST',key:randomUUID(),body:form});assert.equal(paid.status,201);paymentId=(await paid.json()).id
    const receipt=await api(`/pagamentos/${paymentId}/comprovante`,{token:ana.token});assert.equal(receipt.status,200);assert.ok((await receipt.arrayBuffer()).byteLength>0)
  })
  await check('SSE entrega conexão e mudança entre duas contas pelo Nginx',async()=>{
    const abort=new AbortController(), timer=setTimeout(()=>abort.abort(),20000)
    try{
      const stream=await fetch(`${base}/api/notificacoes/eventos`,{headers:{Authorization:`Bearer ${ana.token}`},signal:abort.signal})
      assert.equal(stream.status,200);assert.match(stream.headers.get('content-type'),/text\/event-stream/)
      const reader=stream.body.getReader(),decoder=new TextDecoder();let text=decoder.decode((await reader.read()).value)
      assert.match(text,/event: conectado/)
      const created=await api('/tarefas',{token:admin.token,method:'POST',key:randomUUID(),body:{titulo:'Ensaio DevOps — SSE'}})
      assert.equal(created.status,201);taskId=(await created.json()).id
      while(!text.includes('event: atualizar')){const next=await reader.read();if(next.done)break;text+=decoder.decode(next.value)}
      assert.match(text,/event: atualizar/)
    }finally{clearTimeout(timer);abort.abort()}
  })
  await check('Rejeições preservam requestId e não exponem token ou conteúdo',async()=>{
    const response=await api('/me');assert.equal(response.status,401);assert.match(response.headers.get('x-request-id'),/^[a-f0-9-]{36}$/)
    const log=run(['-n','rephouse-demo','logs','deployment/api','--tail=200'])
    assert.doesNotMatch(log,new RegExp(admin.token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
    assert.ok(!log.includes(state.demoPassword));assert.ok(!log.includes('admin.horizonte@demo.rephouse.test'))
    const events=log.split('\n').filter(Boolean).map(x=>JSON.parse(x));assert.ok(events.some(x=>x.requestId===response.headers.get('x-request-id')))
  })
  if(process.argv.includes('--operacao')){
    await check('Recriar Pod do banco preserva tarefa, foto e comprovante',async()=>{
      run(['-n','rephouse-demo','delete','pod','postgres-0'])
      run(['-n','rephouse-demo','rollout','status','statefulset/postgres','--timeout=180s'])
      for(let i=0;i<60;i++){try{if((await api('/me',{token:admin.token})).status===200)break}catch{}await delay(1000)}
      assert.equal((await api(`/tarefas/${taskId}`,{token:admin.token})).status,200)
      assert.equal((await api(`/usuarios/${admin.usuario.id}/foto`,{token:admin.token})).status,200)
      assert.equal((await api(`/pagamentos/${paymentId}/comprovante`,{token:ana.token})).status,200)
    })
    await check('Atualização e rollback do Deployment mantêm a imagem e os dados',async()=>{
      const original=JSON.parse(run(['-n','rephouse-demo','get','deployment','api','-o','json'])).spec.template.spec.containers[0].image
      const manifest=JSON.parse(await readFile(`${local}/imagens.json`,'utf8'))
      assert.equal(original,manifest.images.find(x=>x.name==='api').image)
      // Tag diferente do mesmo conteúdo: exercita troca de imagem sem inventar nova funcionalidade.
      const rehearsal=`${original}-ensaio`
      const tagged=spawnSync(process.platform==='win32'?'docker.exe':'docker',['tag',original,rehearsal],{encoding:'utf8',windowsHide:true})
      assert.equal(tagged.status,0)
      run(['-n','rephouse-demo','set','image','deployment/api',`api=${rehearsal}`])
      try{
        run(['-n','rephouse-demo','rollout','status','deployment/api','--timeout=180s'])
        assert.equal(JSON.parse(run(['-n','rephouse-demo','get','deployment','api','-o','json'])).spec.template.spec.containers[0].image,rehearsal)
        assert.equal((await api(`/tarefas/${taskId}`,{token:admin.token})).status,200)
      }finally{
        run(['-n','rephouse-demo','rollout','undo','deployment/api'])
        run(['-n','rephouse-demo','rollout','status','deployment/api','--timeout=180s'])
      }
      const after=JSON.parse(run(['-n','rephouse-demo','get','deployment','api','-o','json'])).spec.template.spec.containers[0].image
      assert.equal(after,original);assert.equal((await api(`/tarefas/${taskId}`,{token:admin.token})).status,200)
    })
  }
  await check('Interface compilada utilizável em computador e celular',async()=>{
    browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})})
    const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'light',reducedMotion:'reduce'})
    const page=await context.newPage();const failed=[];page.on('pageerror',error=>failed.push(error.message))
    await page.goto(`${base}/login`)
    await page.getByLabel('E-mail',{exact:true}).fill('admin.horizonte@demo.rephouse.test');await page.getByLabel('Senha',{exact:true}).fill(state.demoPassword)
    await page.getByRole('button',{name:'Entrar na minha conta',exact:true}).click();await page.waitForURL('**/republica')
    await page.getByRole('heading',{level:1}).waitFor()
    for(const [width,height]of [[1440,900],[390,844]]){await page.setViewportSize({width,height});await delay(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`${local}/capturas/rephouse-${width}.png`})}
    assert.deepEqual(failed,[]);await context.close()
  })
}catch(error){checks.push({name:'falha',passed:false,message:error.message});console.error(error.message);process.exitCode=1}
finally{
  await browser?.close()
  await writeFile(`${local}/validacao-aplicacao.json`,JSON.stringify({executedAt:new Date().toISOString(),checks},null,2))
}
