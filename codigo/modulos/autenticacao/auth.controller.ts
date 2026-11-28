import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import type { RequestHandler } from 'express'
import type { AuthService } from './auth.service.js'
import { email, endpoint, name, password } from '../../compartilhado/http/validation.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import type { GoogleOptions } from './google.service.js'

const googleProof = z.object({ credential: z.string().min(1).max(16000), desafioId: z.uuid(), senha: password.optional() }).strict()
const confirmation = z.union([z.object({ senha: password }).strict(), googleProof.omit({ senha: true })])
const cookieName = 'rephouse_google'
const emailCookieName = 'rephouse_email'
const emailConclusion = z.object({ id: z.uuid(), nome: name.optional(), senha: password.optional() }).strict()
const emailConfirmation = emailConclusion.extend({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), codigoAprovacao: z.string().regex(/^\d{6}$/).optional() })
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
  const emailCookie = (req: Parameters<RequestHandler>[0]) => req.get('Cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith(emailCookieName + '='))?.slice(emailCookieName.length + 1)
  const emailOrigin = (req: Parameters<RequestHandler>[0]) => {
    const value = req.get('Origin')
    if (!value || !origins.includes(value)) throw new AppError(403, 'EMAIL_ORIGIN_FORBIDDEN', 'Origem não autorizada para acesso por e-mail.')
  }
  const pending: (operation: (req: Parameters<RequestHandler>[0], cookie: string) => ReturnType<AuthService['register']>) => RequestHandler = operation => async (req, res) => {
    emailOrigin(req)
    const previous = emailCookie(req)
    const secret = previous && /^[A-Za-z0-9_-]{43}$/.test(previous) ? previous : randomBytes(32).toString('base64url')
    // Mesmo se o provedor falhar depois do commit, o navegador conserva a prova para reenviar.
    res.cookie(emailCookieName, secret, { httpOnly: true, sameSite: 'lax', path: '/api', secure: options?.secureCookies ?? false, maxAge: 86_400_000 })
    const result = await operation(req, secret)
    res.status(202).json(result.response)
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
    register: pending((req, cookie) => service.register(z.object({ nome: name, email, senha: password, acaoRepublica: z.enum(['criar','entrar']).optional() }).strict().parse(req.body), cookie)),
    requestEmail: pending((req, cookie) => {
      const input = z.object({ email, finalidade: z.enum(['cadastro','login']).default('login') }).strict().parse(req.body)
      return service.requestEmail(input.email, input.finalidade, cookie)
    }),
    confirmEmail: endpoint(req => {
      emailOrigin(req)
      return service.confirmEmail(emailConfirmation.parse(req.body), emailCookie(req))
    }),
    concludeEmail: endpoint(req => {
      emailOrigin(req)
      return service.concludeEmail(emailConclusion.parse(req.body), emailCookie(req))
    }),
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
