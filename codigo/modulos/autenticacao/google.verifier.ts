import { createRemoteJWKSet, jwtVerify, errors, type JWTVerifyGetKey } from 'jose'
import { z } from 'zod'
import { AppError } from '../../compartilhado/http/app-error.js'

const claims = z.object({
  sub: z.string().min(1).max(255), email: z.email().max(254), email_verified: z.literal(true),
  nonce: z.string().min(1).max(256), exp: z.number().int().positive(),
  name: z.string().trim().min(1).optional(), azp: z.string().optional(),
})
export type GoogleIdentity = z.infer<typeof claims>
export type GoogleVerifier = (credential: string) => Promise<GoogleIdentity>

// A chave remota tem cache e timeout; testes usam chaves locais, sem atalhos de validação.
export function createGoogleVerifier(clientId: string, key?: JWTVerifyGetKey): GoogleVerifier {
  const remote = key ?? createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), { timeoutDuration: 2000 })
  const resolveKey: JWTVerifyGetKey = async (...args) => {
    try { return await remote(...args) }
    catch (error) {
      if (error instanceof errors.JWKSNoMatchingKey || error instanceof errors.JWKSMultipleMatchingKeys) throw error
      throw new AppError(503, 'GOOGLE_UNAVAILABLE', 'O Google está indisponível. Tente novamente mais tarde.')
    }
  }
  return async credential => {
    try {
      const { payload } = await jwtVerify(credential, resolveKey, {
        algorithms: ['RS256'], issuer: ['accounts.google.com', 'https://accounts.google.com'],
        audience: clientId, requiredClaims: ['exp', 'sub', 'email', 'email_verified', 'nonce'],
      })
      const identity = claims.parse(payload)
      if (payload.aud !== clientId) throw new Error('aud')
      if (identity.azp && identity.azp !== clientId) throw new Error('azp')
      return { ...identity, email: identity.email.toLowerCase() }
    } catch (error) {
      if (error instanceof AppError) throw error
      if (error instanceof errors.JWKSTimeout || error instanceof TypeError) {
        throw new AppError(503, 'GOOGLE_UNAVAILABLE', 'O Google está indisponível. Tente novamente mais tarde.')
      }
      throw new AppError(401, 'GOOGLE_INVALID_CREDENTIAL', 'A confirmação Google é inválida ou expirou.')
    }
  }
}
