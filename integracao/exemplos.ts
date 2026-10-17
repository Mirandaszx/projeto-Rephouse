import type {components,paths} from './api.js'

type Login=components['schemas']['Login']
type Sessao=components['schemas']['Sessao']
type Pagamento=components['schemas']['Pagamento']
type RegistrarPagamento=components['schemas']['RegistrarPagamento']
type Multipart=paths['/api/pagamentos']['post']['requestBody']['content']['multipart/form-data']
type Despesas=paths['/api/despesas']['get']['responses'][200]['content']['application/json']

export class ErroResposta extends Error {
  readonly status:number
  readonly code:string
  readonly requestId:string|null
  readonly retryAfter:string|null
  constructor(status:number,code:string,message:string,requestId:string|null,retryAfter:string|null){
    super(message);this.status=status;this.code=code;this.requestId=requestId;this.retryAfter=retryAfter
  }
}
// Exemplo de leitura do erro público. Não registra corpo, token nem conteúdo do arquivo.
async function conferir(response:Response){
  if(response.ok)return
  const body=await response.json().catch(()=>null) as {error?:{code?:string;message?:string}}|null
  throw new ErroResposta(response.status,body?.error?.code??'HTTP_ERROR',body?.error?.message??'Requisição não concluída.',response.headers.get('X-Request-Id'),response.headers.get('Retry-After'))
}

export async function login(baseUrl:string,input:Login):Promise<Sessao>{
  const response=await fetch(`${baseUrl}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})
  await conferir(response);return await response.json() as Sessao
}
export async function listarDespesas(baseUrl:string,token:string,pagina=1,limite=20):Promise<Despesas>{
  const query=new URLSearchParams({pagina:String(pagina),limite:String(limite)})
  const response=await fetch(`${baseUrl}/api/despesas?${query}`,{headers:{Authorization:`Bearer ${token}`}})
  await conferir(response);return await response.json() as Despesas
}
// Gere a chave uma vez por intenção de pagamento e mantenha corpo/arquivo para reenvio manual.
export async function pagar(baseUrl:string,token:string,input:RegistrarPagamento,chave:string,arquivo?:Multipart['comprovante']):Promise<Pagamento>{
  const headers:Record<string,string>={Authorization:`Bearer ${token}`,'Idempotency-Key':chave}
  let body:string|FormData
  if(arquivo){
    const form=new FormData();form.set('rateioId',input.rateioId);form.set('valor',input.valor);form.set('comprovante',arquivo,'comprovante')
    body=form // O navegador define Content-Type e boundary do multipart.
  }else{headers['Content-Type']='application/json';body=JSON.stringify(input)}
  const response=await fetch(`${baseUrl}/api/pagamentos`,{method:'POST',headers,body})
  await conferir(response);return await response.json() as Pagamento
}
export async function baixarComprovante(baseUrl:string,token:string,pagamentoId:string){
  const response=await fetch(`${baseUrl}/api/pagamentos/${encodeURIComponent(pagamentoId)}/comprovante`,{headers:{Authorization:`Bearer ${token}`}})
  await conferir(response)
  return {arquivo:await response.blob(),disposicao:response.headers.get('Content-Disposition'),requestId:response.headers.get('X-Request-Id')}
}
export async function logout(baseUrl:string,token:string):Promise<void>{
  const response=await fetch(`${baseUrl}/api/auth/logout`,{method:'POST',headers:{Authorization:`Bearer ${token}`}})
  await conferir(response) // 204 não contém JSON.
}
