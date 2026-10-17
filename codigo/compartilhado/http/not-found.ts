import type { RequestHandler } from 'express'
import { AppError } from './app-error.js'

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Rota não encontrada.'))
}
