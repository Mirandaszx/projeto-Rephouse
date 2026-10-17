import { Router } from 'express'
import type { createTarefasController } from './tarefas.controller.js'
export function createTarefasRouter(c: ReturnType<typeof createTarefasController>) {
  const r = Router({ mergeParams: true })
  r.get('/', c.list).post('/', c.create).patch('/:id', c.edit)
  return r
}
