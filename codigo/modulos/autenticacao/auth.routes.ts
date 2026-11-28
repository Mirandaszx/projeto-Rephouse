import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import type { createAuthController } from './auth.controller.js'

export function createAuthRouter(controller: ReturnType<typeof createAuthController>) {
  const router = Router()
  const limit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Aguarde antes de tentar novamente.' } } })
  router.post('/register', limit, controller.register)
  router.post('/login', limit, controller.login)
  router.post('/email/solicitar', limit, controller.requestEmail)
  router.post('/email/confirmar', limit, controller.confirmEmail)
  router.post('/email/concluir', rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Aguarde antes de verificar a confirmação novamente.' } } }), controller.concludeEmail)
  router.get('/metodos', controller.methods)
  router.post('/google', limit, controller.googleLogin)
  router.post('/google/desafio', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Aguarde antes de solicitar outro desafio.' } },
  }), controller.challenge)
  router.post('/logout', controller.authenticate, controller.logout)
  return router
}
