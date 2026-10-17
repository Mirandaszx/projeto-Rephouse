import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileTypeFromBuffer } from 'file-type'
import { AppError } from '../../compartilhado/http/app-error.js'

export interface ReceiptIO {
  mkdir(path:string):Promise<unknown>
  open(path:string):Promise<{writeFile(data:Buffer):Promise<unknown>;sync():Promise<void>;close():Promise<void>}>
  unlink(path:string):Promise<void>
}
const disk:ReceiptIO={mkdir:path=>mkdir(path,{recursive:true}),open:path=>open(path,'wx'),unlink}
export function createReceiptStore(directory: string, io:ReceiptIO=disk) {
  const root = resolve(directory)
  function path(name: string) {
    if (!/^[a-f0-9-]{36}\.(pdf|png|jpg|webp)$/.test(name)) throw new AppError(404, 'NOT_FOUND', 'Comprovante não encontrado.')
    return resolve(root, name)
  }
  return {
    path,
    async save(file: Express.Multer.File) {
      const type = await fileTypeFromBuffer(file.buffer)
      if (!type || !['application/pdf','image/png','image/jpeg','image/webp'].includes(type.mime)) {
        throw new AppError(400, 'INVALID_FILE', 'Envie PDF, PNG, JPEG ou WEBP válido.')
      }
      const name = `${randomUUID()}.${type.ext}`
      let handle:Awaited<ReturnType<ReceiptIO['open']>>|undefined
      let created=false
      try {
        await io.mkdir(root)
        handle=await io.open(path(name));created=true
        await handle.writeFile(file.buffer);await handle.sync();await handle.close();handle=undefined
        return { name, hash: createHash('sha256').update(file.buffer).digest('hex') }
      }catch{
        await handle?.close().catch(()=>{})
        if(created)await io.unlink(path(name)).catch(()=>{})
        // O pagamento só será iniciado depois de concluir e sincronizar a escrita.
        throw new AppError(503,'STORAGE_UNAVAILABLE','Armazenamento temporariamente indisponível.')
      }
    },
    async remove(name: string) { await unlink(path(name)).catch(() => {}) },
  }
}
export type ReceiptStore = ReturnType<typeof createReceiptStore>
