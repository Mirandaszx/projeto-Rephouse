// Somente códigos estruturados entram na classificação. Mensagens podem conter SQL/segredos.
export function databaseCodes(error: unknown): Set<string> {
  const found=new Set<string>(),seen=new Set<object>(),queue:unknown[]=[error]
  while(queue.length&&seen.size<64){
    const value=queue.pop()
    if(!value||typeof value!=='object'||seen.has(value))continue
    seen.add(value)
    const item=value as Record<string,unknown>
    for(const key of ['code','originalCode','sqlState'])if(typeof item[key]==='string')found.add(item[key])
    for(const key of ['cause','meta','driverAdapterError','originalError'])queue.push(item[key])
  }
  return found
}
export function classifyDatabaseError(error: unknown): {status:number;code:string;message:string}|undefined {
  const codes=databaseCodes(error)
  const has=(values:string[])=>values.some(code=>codes.has(code))
  if(has(['40001','40P01','P2034']))return {status:503,code:'RETRY_LATER',message:'Conflito temporário. Tente novamente com a mesma chave de pagamento.'}
  if(has(['ECONNREFUSED','ECONNRESET','ETIMEDOUT','EPIPE','57P01','57P02','57P03','53300','08000','08001','08003','08006','57014','P1001','P1002','P1008','P1017','P2024','P2028']))return {status:503,code:'DATABASE_UNAVAILABLE',message:'Banco temporariamente indisponível.'}
  if(has(['RH001','23503','23001','P2003']))return {status:409,code:'DOMAIN_CONFLICT',message:'A operação conflita com o estado atual dos dados.'}
  if(has(['23505','P2002']))return {status:409,code:'CONFLICT',message:'Já existe um registro com estes dados.'}
  if(has(['23514','22P02','22003']))return {status:400,code:'VALIDATION_ERROR',message:'Os dados enviados são inválidos.'}
  return undefined
}
