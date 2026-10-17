import type { MembroRepublica, Republica, Usuario } from '../../codigo/gerado/prisma/client.js'

export interface RepublicaFixture {
  admin: Usuario
  republica: Republica
  membros: MembroRepublica[]
  usuarios: Usuario[]
}

export function errorRecord(error: unknown): Record<string, unknown> {
  return error !== null && typeof error === 'object' ? error as Record<string, unknown> : {}
}

export function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
