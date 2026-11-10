import { Router, type Request, type RequestHandler } from 'express'
import { z } from 'zod'
import type { Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { pagination, type Page, type PageInput } from '../../compartilhado/http/pagination.js'
import { endpoint } from '../../compartilhado/http/validation.js'
import { notFoundHandler } from '../../compartilhado/http/not-found.js'

export const FRONT_PREFIX = '/api/front/v1'
export const FRONT_COLLECTION_LIMIT = 1000

// Os mesmos routers preservam autenticação, limites, uploads e transações.
// A marca é interna: nenhum header ou parâmetro habilita o formato na API principal.
export function createFrontendCompatibilityRouter(auth: Router, api: Router) {
  const router = Router()
  router.use((_req, res, next) => { res.locals.frontCompatibility = true; next() })
  router.use('/auth', auth)
  router.use(api)
  router.use(notFoundHandler)
  return router
}

export function collectionEndpoint(
  operation: (request: Request, actor: Actor, page: PageInput) => Promise<unknown>,
  members = false,
): RequestHandler {
  return async (req, res, next) => {
    const compatible = res.locals.frontCompatibility === true
    // O protótipo trabalha com a coleção completa. Nunca devolver só a primeira
    // página como se fosse o conjunto inteiro, nem permitir uma consulta ilimitada.
    if (compatible) z.object(members ? { inativos: z.enum(['true', 'false']).optional() } : {}).strict().parse(req.query)
    const page = compatible ? { pagina: 1, limite: FRONT_COLLECTION_LIMIT + 1 } : pagination(req.query, members)
    await endpoint(async (request, actor) => {
      const result = await operation(request, actor, page)
      if (!compatible) return result
      const collection = result as Page<unknown>
      if (!Array.isArray(collection.dados) || !Number.isInteger(collection.paginacao?.totalItens)) {
        throw new Error('O adaptador exige o resultado paginado do serviço.')
      }
      if (collection.paginacao.totalItens > FRONT_COLLECTION_LIMIT) {
        throw new AppError(409, 'FRONT_COLLECTION_LIMIT', 'Há registros demais para esta tela. Utilize a interface com paginação.')
      }
      return collection.dados
    })(req, res, next)
  }
}
