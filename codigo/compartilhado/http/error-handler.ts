import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '../../gerado/prisma/client.js'
import { MulterError } from 'multer'
import { AppError } from './app-error.js'

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error)
    return
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: { code: error.code, message: error.message } })
    return
  }

  if (error instanceof ZodError) {
    response.status(400).json({ error: {
      code: 'VALIDATION_ERROR',
      message: 'Os dados enviados são inválidos.',
    } })
    return
  }
  if (error instanceof MulterError) {
    response.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: {
      code: error.code, message: error.code === 'LIMIT_FILE_SIZE' ? 'O comprovante deve ter no máximo 5 MB.' : 'Upload inválido.',
    } })
    return
  }

  if (error instanceof SyntaxError && 'status' in error && error.status === 400
    && 'type' in error && error.type === 'entity.parse.failed') {
    response.status(400).json({ error: {
      code: 'INVALID_JSON',
      message: 'O corpo da requisição contém JSON inválido.',
    } })
    return
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2034') {
      response.status(503).json({ error: { code: 'RETRY_LATER', message: 'Conflito temporário. Tente novamente com a mesma chave de pagamento.' } })
      return
    }
    if (error.code === 'P2002') {
      response.status(409).json({ error: {
        code: 'CONFLICT',
        message: 'Já existe um registro com estes dados.',
      } })
      return
    }
    if (error.code === 'P2025') {
      response.status(404).json({ error: {
        code: 'NOT_FOUND',
        message: 'Registro não encontrado.',
      } })
      return
    }
  }

  response.status(500).json({ error: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Erro interno do servidor.',
  } })
}
