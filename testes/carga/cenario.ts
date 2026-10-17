import http from 'k6/http'
import {check,sleep} from 'k6'
import {SharedArray} from 'k6/data'
import {Trend,Rate,Counter} from 'k6/metrics'
interface Actor {token:string;admin:boolean;republicaId:string;despesaId:string;rateioId:string;tarefaId:string}
const actors=new SharedArray('atores',()=>JSON.parse(open('/dados/atores.json')).actors as Actor[])
const reads=new Trend('leituras_ms',true),writes=new Trend('escritas_ms',true),failures=new Rate('falhas_inesperadas'),errors500=new Counter('erros_500'),isolation=new Counter('violacoes_isolamento')
const payments=new Counter('pagamentos_confirmados')
const full=__ENV.CARGA_PERFIL==='completo'
export const options={
  stages:full?[{duration:'30s',target:10},{duration:'30s',target:25},{duration:'30s',target:50},{duration:'5m',target:50},{duration:'30s',target:0}]:[{duration:'5s',target:5},{duration:'20s',target:5},{duration:'5s',target:0}],
  thresholds:{leituras_ms:['p(95)<750'],escritas_ms:['p(95)<1500'],falhas_inesperadas:['rate<0.01'],erros_500:['count==0'],violacoes_isolamento:['count==0'],checks:['rate==1']},
  summaryTrendStats:['avg','med','p(95)','p(99)','max'],
}
export default function(){
  const actor=actors[(__VU-1)%actors.length] as Actor
  const turn=__ITER%10,write=turn>=8
  let path='/api/despesas?limite=20',method='GET',body:unknown=undefined
  if(!write)path=turn<4?'/api/despesas?limite=20':turn<6?'/api/dashboard':turn===6?'/api/me/financeiro?limite=20':'/api/tarefas?limite=20'
  else if(actor.admin){path=`/api/despesas/${actor.despesaId}`;method='PATCH';body={titulo:'Carga de metadados'}}
  else if(turn===8){path='/api/pagamentos';method='POST';body={rateioId:actor.rateioId,valor:'0.01'}}
  else{path=`/api/tarefas/${actor.tarefaId}`;method='PATCH';body={status:'CONCLUIDA'}}
  const key='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return(c==='x'?n:(n&3)|8).toString(16)})
  const result=http.request(method,`http://api:3000${path}`,body?JSON.stringify(body):null,{headers:{Authorization:`Bearer ${actor.token}`,'Content-Type':'application/json','Idempotency-Key':key},tags:{name:write?'escrita':path.split('?')[0]!},timeout:'30s'})
  ;(write?writes:reads).add(result.timings.duration)
  const ok=result.status>=200&&result.status<300
  failures.add(!ok);errors500.add(result.status===500?1:0);isolation.add(0)
  payments.add(method==='POST'&&ok?1:0)
  check(result,{'resposta esperada':()=>ok,'requestId presente':r=>!!r.headers['X-Request-Id']})
  if(ok&&method==='GET'&&path!=='/api/dashboard'){
    const data=result.json() as unknown as {dados:{republicaId?:string;despesa?:{republica:{id:string}}}[];paginacao:{limite:number}}
    const scoped=Array.isArray(data.dados)&&data.dados.length<=20&&data.dados.every(row=>(row.republicaId??row.despesa?.republica.id)===actor.republicaId)
    isolation.add(scoped?0:1);check(data,{'contexto e paginação corretos':()=>scoped})
  }
  sleep(1)
}
export function handleSummary(data:unknown){return {'/dados/resumo-k6.json':JSON.stringify(data,null,2)}}
