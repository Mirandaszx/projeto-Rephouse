import { Router } from 'express'
import type { createTarefasController } from './tarefas.controller.js'
export function createTarefasRouter(c: ReturnType<typeof createTarefasController>) {
  const r = Router({ mergeParams: true })
  r.get('/', c.list).post('/', c.create).get('/:id', c.get).patch('/:id', c.edit)
  r.post('/:id/assumir', c.assume).post('/:id/liberar', c.release)
  return r
}
