import type { components, paths } from './api.js'
import { conferir } from './exemplos.js'

type Categoria = 'TODAS'|'TAREFAS'|'DESPESAS'|'GERAIS'
type Caixa = paths['/api/notificacoes']['get']['responses'][200]['content']['application/json']
export async function consultarNotificacoes(baseUrl:string,token:string,categoria:Categoria='TODAS',pagina=1):Promise<Caixa>{
  const query=new URLSearchParams({categoria,pagina:String(pagina),limite:'20'})
  const response=await fetch(`${baseUrl}/api/notificacoes?${query}`,{headers:{Authorization:`Bearer ${token}`}})
  await conferir(response);return await response.json() as Caixa
}
export async function consultarNaoLidas(baseUrl:string,token:string):Promise<components['schemas']['NotificacoesNaoLidas']>{
  const response=await fetch(`${baseUrl}/api/notificacoes/nao-lidas`,{headers:{Authorization:`Bearer ${token}`}})
  await conferir(response);return await response.json() as components['schemas']['NotificacoesNaoLidas']
}
export async function marcarNotificacaoLida(baseUrl:string,token:string,id:string):Promise<void>{
  const response=await fetch(`${baseUrl}/api/notificacoes/${encodeURIComponent(id)}/lida`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'})
  await conferir(response) // 204: não chamar response.json().
}
export async function marcarCategoriaLida(baseUrl:string,token:string,categoria:Categoria):Promise<void>{
  const response=await fetch(`${baseUrl}/api/notificacoes/lidas`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({categoria})})
  await conferir(response)
}
export async function associarTarefa(baseUrl:string,token:string,id:string,acao:'assumir'|'liberar'):Promise<components['schemas']['Tarefa']>{
  const response=await fetch(`${baseUrl}/api/tarefas/${encodeURIComponent(id)}/${acao}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'})
  await conferir(response);return await response.json() as components['schemas']['Tarefa']
}
type Evento = 'conectado'|'atualizar'|'sessao-encerrada'|'contexto-encerrado'|'indisponivel'
const eventos:readonly string[]=['conectado','atualizar','sessao-encerrada','contexto-encerrado','indisponivel']
/** Exemplo mínimo de uma conexão. Reconexão e estado visual pertencem à tela consumidora. */
export async function acompanharNotificacoes(baseUrl:string,token:string,receber:(evento:Evento)=>void,signal:AbortSignal):Promise<void>{
  const response=await fetch(`${baseUrl}/api/notificacoes/eventos`,{headers:{Authorization:`Bearer ${token}`},signal})
  await conferir(response)
  if(!response.body||!response.headers.get('content-type')?.includes('text/event-stream'))throw new Error('Fluxo de notificações indisponível.')
  const reader=response.body.getReader(),decoder=new TextDecoder()
  let buffer=''
  try{
    for(;;){
      const part=await reader.read();if(part.done)return
      buffer+=decoder.decode(part.value,{stream:true}).replaceAll('\r\n','\n')
      let boundary:number
      while((boundary=buffer.indexOf('\n\n'))>=0){
        const frame=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2)
        const event=frame.split('\n').find(line=>line.startsWith('event:'))?.slice(6).trim()
        if(event&&eventos.includes(event))receber(event as Evento)
      }
      if(buffer.length>65536)throw new Error('Evento de notificações inválido.')
    }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
