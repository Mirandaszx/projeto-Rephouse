import { Router } from 'express'
import type { createRepublicasController } from './republicas.controller.js'

export function createRepublicasRouter(c: ReturnType<typeof createRepublicasController>) {
  const r = Router()
  r.post('/', c.create)
  r.get('/atual', c.current).patch('/atual', c.edit)
  r.post('/entrar', c.join).post('/sair', c.leave).post('/trocar', c.swap)
  r.post('/transferir-admin', c.transfer)
  return r
}
