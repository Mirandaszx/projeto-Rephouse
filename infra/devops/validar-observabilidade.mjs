import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import https from 'node:https'
import { setTimeout as delay } from 'node:timers/promises'
import { context, forward, elastic, prepare, kube } from './operar.mjs'

const local='.devops-local/devops', ns='rephouse-observabilidade', checks=[]
await context();const state=await prepare(), es=await forward(ns,'elasticsearch',9200)
async function check(name,fn){await fn();checks.push({name,passed:true});console.log(`OK: ${name}`)}
async function probe(){const r=await fetch('http://127.0.0.1:5180/api/me',{signal:AbortSignal.timeout(10000)});assert.equal(r.status,401);return r.headers.get('x-request-id')}
async function search(ids){return elastic(state,es.port,'/rephouse-api-*/_search','POST',{size:0,query:{terms:{requestId:ids}},aggs:{ids:{terms:{field:'requestId',size:100}}}})}
async function waitIds(ids){
  for(let i=0;i<60;i++){
    try{const result=await search(ids);if(result.aggregations.ids.buckets.length===ids.length)return result}catch{}
    await delay(1000)
  }
  throw new Error('Os requestIds não apareceram no índice dentro do limite.')
}
let browser,paused=false
try{
  let first
  await check('Elasticsearch exige autenticação e valida certificado',async()=>{
    const ca=await readFile(`${local}/certs/ca.crt`)
    const status=await new Promise((resolve,reject)=>{https.get({hostname:'127.0.0.1',port:es.port,path:'/',ca},res=>{res.resume();resolve(res.statusCode)}).on('error',reject)})
    assert.equal(status,401)
    const license=await elastic(state,es.port,'/_license');assert.equal(license.license.type,'basic')
  })
  await check('Requisição real localizada pelo requestId com campos operacionais',async()=>{
    first=await probe();await waitIds([first])
    const result=await elastic(state,es.port,'/rephouse-api-*/_search','POST',{size:5,query:{bool:{filter:[{term:{requestId:first}},{term:{event:'http'}}]}}})
    assert.equal(result.hits.total.value,1);const log=result.hits.hits[0]._source
    assert.equal(log.status,401);assert.equal(log['service.name'],'rephouse-api');assert.equal(log['service.version'],'4.2.0');assert.equal(typeof log.durationMs,'number')
    for(const value of [state.demoPassword,state.jwt,state.elasticPassword])assert.ok(!JSON.stringify(log).includes(value))
  })
  await check('Coletor retoma após interrupção e preserva offsets sem duplicar os eventos verificados',async()=>{
    await kube(['-n',ns,'patch','daemonset','filebeat','--type=merge','-p',JSON.stringify({spec:{template:{spec:{nodeSelector:{'rephouse.devops/paused':'true'}}}}})]);paused=true
    for(let i=0;i<30;i++){const pods=JSON.parse((await kube(['-n',ns,'get','pods','-l','app=filebeat','-o','json'],{capture:true})).out);if(!pods.items.length)break;await delay(1000)}
    const absent=JSON.parse((await kube(['-n',ns,'get','pods','-l','app=filebeat','-o','json'],{capture:true})).out);assert.equal(absent.items.length,0)
    const ids=[await probe(),await probe(),await probe()]
    await kube(['-n',ns,'patch','daemonset','filebeat','--type=merge','-p',JSON.stringify({spec:{template:{spec:{nodeSelector:null}}}})]);paused=false
    await kube(['-n',ns,'rollout','status','daemonset/filebeat','--timeout=180s'])
    const found=await waitIds(ids);assert.equal(found.aggregations.ids.buckets.length,3)
    // Cada 401 produz um evento HTTP; a validação não confunde isso com um evento de erro separado.
    const http=await elastic(state,es.port,'/rephouse-api-*/_search','POST',{size:0,query:{bool:{filter:[{terms:{requestId:[first,...ids]}},{term:{event:'http'}}]}},aggs:{ids:{terms:{field:'requestId',size:100}}}})
    assert.ok(http.aggregations.ids.buckets.every(x=>x.doc_count===1))
  })
  await check('Retenção e credencial limitada do coletor configuradas',async()=>{
    const policy=await elastic(state,es.port,'/_ilm/policy/rephouse-seven-days');assert.equal(policy['rephouse-seven-days'].policy.phases.delete.min_age,'7d')
    const keyId=state.filebeatApiKey.split(':')[0], keys=await elastic(state,es.port,`/_security/api_key?id=${keyId}`)
    assert.equal(keys.api_keys[0].invalidated,false)
    assert.deepEqual(keys.api_keys[0].role_descriptors.writer.indices[0].names,['rephouse-api-*'])
  })
  await check('Kibana autenticado e dashboard com dados visíveis',async()=>{
    const require=createRequire(import.meta.url),{chromium}=require('../../interface/node_modules/playwright')
    browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})})
    const page=await browser.newPage({viewport:{width:1440,height:1000}})
    await page.goto('http://127.0.0.1:5601/app/dashboards#/view/rephouse-devops-local')
    await page.locator('input[name="username"]').fill('demo_observer');await page.locator('input[name="password"]').fill(state.observerPassword)
    await page.getByRole('button',{name:/log in/i}).click()
    await page.getByText('RepHouse — operação local',{exact:true}).first().waitFor({timeout:60000})
    await page.getByText('Requisições ao longo do tempo',{exact:true}).first().waitFor({timeout:60000})
    await page.getByText('Erros mais frequentes (código)',{exact:true}).first().waitFor({timeout:60000})
    await page.getByText('Memória da API (MB)',{exact:true}).first().waitFor({timeout:60000})
    await delay(5000);await mkdir(`${local}/capturas`,{recursive:true});await page.screenshot({path:`${local}/capturas/kibana-dashboard.png`,fullPage:true})
  })
  await check('Saturação (4º sinal dourado) chega ao índice com valores numéricos',async()=>{
    // A API grava uma amostra por minuto; espera até 90 s pela primeira após a implantação.
    for(let i=0;i<90;i++){
      const result=await elastic(state,es.port,'/rephouse-api-*/_search','POST',{size:1,sort:[{'@timestamp':'desc'}],query:{term:{event:'runtime'}}}).catch(()=>null)
      const sample=result?.hits.hits[0]?._source
      if(sample){for(const field of ['memoryRssMb','heapUsedMb','eventLoopUtilization','eventLoopDelayP99Ms'])assert.equal(typeof sample[field],'number',field);return}
      await delay(1000)
    }
    throw new Error('Nenhuma amostra de saturação no índice.')
  })
  await check('Dashboard com filtros e regra de alerta de 5xx ativa no Kibana',async()=>{
    const auth={authorization:`Basic ${Buffer.from(`demo_observer:${state.observerPassword}`).toString('base64')}`}
    const dashboard=await (await fetch('http://127.0.0.1:5601/api/saved_objects/dashboard/rephouse-devops-local',{headers:auth})).json()
    assert.equal(JSON.parse(dashboard.attributes.panelsJSON).length,10)
    const controls=Object.values(JSON.parse(dashboard.attributes.controlGroupInput.panelsJSON)).map(x=>x.explicitInput.fieldName).sort()
    assert.deepEqual(controls,['code','path'])
    const rule=await (await fetch('http://127.0.0.1:5601/api/alerting/rule/rephouse-picos-5xx',{headers:auth})).json()
    assert.equal(rule.enabled,true);assert.equal(rule.rule_type_id,'.index-threshold');assert.equal(rule.params.filterKuery,'event: http AND status >= 500')
  })
  const stats=JSON.parse((await kube(['get','--raw','/api/v1/nodes/desktop-control-plane/proxy/stats/summary'],{capture:true})).out)
  const resources=stats.pods.filter(x=>['rephouse-demo',ns].includes(x.podRef.namespace)).map(x=>({namespace:x.podRef.namespace,pod:x.podRef.name,workingSetBytes:x.memory?.workingSetBytes,cpuNanoCores:x.cpu?.usageNanoCores}))
  await writeFile(`${local}/recursos.json`,JSON.stringify({measuredAt:new Date().toISOString(),nodeWorkingSetBytes:stats.node.memory?.workingSetBytes,resources},null,2))
}catch(error){checks.push({name:'falha',passed:false,message:error.message});console.error(error.message);process.exitCode=1}
finally{
  if(paused)await kube(['-n',ns,'patch','daemonset','filebeat','--type=merge','-p',JSON.stringify({spec:{template:{spec:{nodeSelector:null}}}})]).catch(()=>{})
  await browser?.close();es.close()
  await writeFile(`${local}/validacao-observabilidade.json`,JSON.stringify({executedAt:new Date().toISOString(),checks},null,2))
}
