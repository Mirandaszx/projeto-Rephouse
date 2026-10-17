import { Router } from 'express'
import type { createFinanceiroController } from './financeiro.controller.js'

export function createFinanceiroRouter(c: ReturnType<typeof createFinanceiroController>) {
  const r = Router({ mergeParams: true })
  r.get('/', c.list).post('/', c.create)
  r.get('/:id', c.detail).patch('/:id', c.edit)
  return r
}
