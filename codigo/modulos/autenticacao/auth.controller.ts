import { z } from 'zod'
import type { RequestHandler } from 'express'
import type { AuthService } from './auth.service.js'
import { email, endpoint, name, password } from '../../compartilhado/http/validation.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import type { GoogleOptions } from './google.service.js'

const googleProof = z.object({ credential: z.string().min(1).max(16000), desafioId: z.uuid(), senha: password.optional() }).strict()
const confirmation = z.union([z.object({ senha: password }).strict(), googleProof.omit({ senha: true })])
const cookieName = 'rephouse_google'
export function createAuthController(service: AuthService, origins: string[] = [], options?: GoogleOptions) {
  const cookie = (req: Parameters<RequestHandler>[0]) => req.get('Cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith(cookieName + '='))?.slice(cookieName.length + 1)
  const origin = (req: Parameters<RequestHandler>[0]) => {
    const value = req.get('Origin')
    if (!value || !origins.includes(value)) throw new AppError(403, 'GOOGLE_ORIGIN_FORBIDDEN', 'Origem não autorizada para acesso Google.')
  }
  const authenticate: RequestHandler = async (req, res, next) => {
    const authorization = req.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHENTICATED', 'Autenticação necessária.')
    res.locals.actor = await service.verifyToken(authorization.slice(7))
    next()
  }
  return {
    methods: endpoint(async () => service.methods()),
    challenge: (async (req, res) => {
      origin(req)
      const input = z.object({ finalidade: z.enum(['login', 'exclusao']).default('login') }).strict().parse(req.body)
      const authorization = req.get('Authorization')
      if (input.finalidade === 'exclusao' && !authorization?.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHENTICATED', 'Autenticação necessária.')
      const actor = input.finalidade === 'exclusao'
        ? await service.verifyToken(authorization!.slice(7)) : undefined
      const result = await service.challenge(input.finalidade, cookie(req), actor)
      res.cookie(cookieName, result.secret, { httpOnly: true, sameSite: 'lax', path: '/api', secure: options?.secureCookies ?? false, maxAge: 300_000 })
      res.json(result.response)
    }) as RequestHandler,
    googleLogin: endpoint(req => { origin(req); return service.googleLogin(googleProof.parse(req.body), cookie(req)) }),
    authenticate,
    activeSession: (async (_req,res,next)=>{await service.activeSession(res.locals.actor);next()}) as RequestHandler,
    register: endpoint(req => service.register(z.object({ nome: name, email, senha: password }).strict().parse(req.body)), 201),
    login: endpoint(req => service.login(z.object({ email, senha: password }).strict().parse(req.body))),
    me: endpoint((_req, actor) => service.me(actor)),
    edit: endpoint((req, actor) => service.edit(actor, z.object({ nome: name }).strict().parse(req.body).nome)),
    logout: endpoint((_req, actor) => service.logout(actor), 204),
    deleteAccount: endpoint((req, actor) => {
      const input = confirmation.parse(req.body)
      if ('credential' in input) origin(req)
      return service.deleteAccount(actor, 'senha' in input ? input.senha : input, cookie(req))
    }, 204),
  }
}
