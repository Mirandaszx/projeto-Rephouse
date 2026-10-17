import {z} from 'zod'

export interface PageInput {pagina:number;limite:number}
export interface Page<T>{dados:T[];paginacao:{pagina:number;limite:number;totalItens:number;totalPaginas:number}}
const integer=z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().positive())
export function pagination(query:unknown,members=false):PageInput{
  const schema=z.object({pagina:integer.pipe(z.number().max(1000000)).default(1),limite:integer.pipe(z.number().max(100)).default(20),...(members?{inativos:z.enum(['true','false']).optional()}: {})}).strict()
  const {pagina,limite}=schema.parse(query)
  return {pagina,limite}
}
export const pageArgs=(input:PageInput)=>({skip:(input.pagina-1)*input.limite,take:input.limite})
export function pageResult<T>(dados:T[],totalItens:number,input:PageInput):Page<T>{
  return {dados,paginacao:{...input,totalItens,totalPaginas:Math.ceil(totalItens/input.limite)}}
}
