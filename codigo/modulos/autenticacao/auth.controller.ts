import { z } from 'zod'
import type { RequestHandler } from 'express'
import type { AuthService } from './auth.service.js'
import { email, endpoint, name, password } from '../../compartilhado/http/validation.js'
import { AppError } from '../../compartilhado/http/app-error.js'

export function createAuthController(service: AuthService) {
  const authenticate: RequestHandler = async (req, res, next) => {
    const authorization = req.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHENTICATED', 'Autenticação necessária.')
    res.locals.actor = await service.verifyToken(authorization.slice(7))
    next()
  }
  return {
    authenticate,
    register: endpoint(req => service.register(z.object({ nome: name, email, senha: password }).strict().parse(req.body)), 201),
    login: endpoint(req => service.login(z.object({ email, senha: password }).strict().parse(req.body))),
    me: endpoint((_req, actor) => service.me(actor)),
    edit: endpoint((req, actor) => service.edit(actor, z.object({ nome: name }).strict().parse(req.body).nome)),
    logout: endpoint((_req, actor) => service.logout(actor), 204),
    deleteAccount: endpoint((req, actor) => service.deleteAccount(actor, z.object({ senha: password }).strict().parse(req.body).senha), 204),
  }
}
