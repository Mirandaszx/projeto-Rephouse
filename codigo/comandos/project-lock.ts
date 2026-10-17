import {mkdir,open,unlink} from 'node:fs/promises'
import {join} from 'node:path'
import {createHash} from 'node:crypto'

export async function withProjectLock<T>(project:string,folder:string,operation:()=>Promise<T>):Promise<T>{
  await mkdir(folder,{recursive:true})
  const name=createHash('sha256').update(project).digest('hex')
  const path=join(folder,`${name}.lock`)
  let handle
  try{handle=await open(path,'wx',0o600)}catch(error){
    if(error&&typeof error==='object'&&'code'in error&&error.code==='EEXIST')throw new Error('Já existe uma operação de backup/restauração neste projeto. Confira a trava antes de repetir.')
    throw error
  }
  try{
    await handle.writeFile(JSON.stringify({project,pid:process.pid,startedAt:new Date().toISOString()}))
    return await operation()
  }finally{await handle.close();await unlink(path)}
}
