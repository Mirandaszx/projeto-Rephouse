import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import type { createAuthController } from './auth.controller.js'

export function createAuthRouter(controller: ReturnType<typeof createAuthController>) {
  const router = Router()
  const limit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Aguarde antes de tentar novamente.' } } })
  router.post('/register', limit, controller.register)
  router.post('/login', limit, controller.login)
  router.post('/logout', controller.authenticate, controller.logout)
  return router
}
