import type {components,paths} from './api.js'
import {conferir} from './exemplos.js'

type Moradores=paths['/api/membros']['get']['responses'][200]['content']['application/json']
type Tarefas=paths['/api/tarefas']['get']['responses'][200]['content']['application/json']

export async function consultarMinhaConta(baseUrl:string,token:string):Promise<components['schemas']['MinhaConta']>{
  const response=await fetch(`${baseUrl}/api/me`,{headers:{Authorization:`Bearer ${token}`}})
  await conferir(response)
  return await response.json() as components['schemas']['MinhaConta']
}

export async function listarMoradores(baseUrl:string,token:string,pagina=1,limite=20,inativos=false):Promise<Moradores>{
  const query=new URLSearchParams({pagina:String(pagina),limite:String(limite),inativos:String(inativos)})
  const response=await fetch(`${baseUrl}/api/membros?${query}`,{headers:{Authorization:`Bearer ${token}`}})
  await conferir(response)
  return await response.json() as Moradores
}

export async function criarTarefa(baseUrl:string,token:string,input:components['schemas']['CriarTarefa']):Promise<components['schemas']['Tarefa']>{
  const response=await fetch(`${baseUrl}/api/tarefas`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(input)})
  await conferir(response)
  return await response.json() as components['schemas']['Tarefa']
}

export async function listarTarefas(baseUrl:string,token:string,pagina=1,limite=20):Promise<Tarefas>{
  const query=new URLSearchParams({pagina:String(pagina),limite:String(limite)})
  const response=await fetch(`${baseUrl}/api/tarefas?${query}`,{headers:{Authorization:`Bearer ${token}`}})
  await conferir(response)
  return await response.json() as Tarefas
}

export async function concluirTarefa(baseUrl:string,token:string,tarefaId:string):Promise<components['schemas']['Tarefa']>{
  // Somente o status é enviado: um morador não pode editar os demais campos.
  const response=await fetch(`${baseUrl}/api/tarefas/${encodeURIComponent(tarefaId)}`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({status:'CONCLUIDA'})})
  await conferir(response)
  return await response.json() as components['schemas']['Tarefa']
}
