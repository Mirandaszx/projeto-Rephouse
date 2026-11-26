import 'dotenv/config'
import { z } from 'zod'
import { appTimeZone, DEFAULT_TIME_ZONE } from './time-zone.js'

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_TIME_ZONE: z.string().default(DEFAULT_TIME_ZONE).refine(value => {
    try { appTimeZone(value); return true } catch { return false }
  }, 'Informe um fuso IANA válido.'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // Quantos proxies confiáveis ficam na frente da API (Vite ou Nginx = 1). Com 0, X-Forwarded-For é ignorado.
  TRUST_PROXY: z.coerce.number().int().min(0).max(3).default(0),
  JWT_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.preprocess(value => value === '' ? undefined : value, z.string().regex(/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/).optional()),
  RESEND_API_KEY: z.preprocess(value => value === '' ? undefined : value, z.string().regex(/^re_[A-Za-z0-9_-]+$/).optional()),
  BREVO_API_KEY: z.preprocess(value => value === '' ? undefined : value, z.string().regex(/^xkeysib-[A-Za-z0-9_-]+$/).optional()),
  EMAIL_FROM: z.preprocess(value => value === '' ? undefined : value, z.email().optional()),
  // Contato para pedidos de privacidade (LGPD). Sem ele, a política usa o remetente EMAIL_FROM.
  PRIVACY_CONTACT_EMAIL: z.preprocess(value => value === '' ? undefined : value, z.email().optional()),
  APP_PUBLIC_URL: z.preprocess(value => value === '' ? undefined : value, z.url().refine(value => {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && value === url.origin && !url.username && !url.password
  }, 'APP_PUBLIC_URL deve ser uma origem HTTP(S), sem caminho.').optional()),
  CORS_ORIGINS: z.string().default('').transform(value => value.split(',').map(origin => origin.trim()).filter(Boolean))
    .pipe(z.array(z.url().refine(value => {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) && url.origin === value
    }, 'Informe origens HTTP(S) completas, sem caminho, separadas por vírgula.'))),
  DATABASE_URL: z.url().refine(value => {
    const protocol = new URL(value).protocol
    return protocol === 'postgresql:' || protocol === 'postgres:'
  }, 'DATABASE_URL deve usar PostgreSQL.'),
}).superRefine((env, ctx) => {
  // Um provedor por vez: Brevo (deploy sem domínio próprio) ou Resend (domínio verificado).
  if (env.RESEND_API_KEY && env.BREVO_API_KEY) ctx.addIssue({ code: 'custom', message: 'Configure só um provedor de e-mail: BREVO_API_KEY ou RESEND_API_KEY.' })
  const provided = [env.RESEND_API_KEY ?? env.BREVO_API_KEY, env.EMAIL_FROM, env.APP_PUBLIC_URL].filter(Boolean).length
  if (provided > 0 && provided < 3) ctx.addIssue({ code: 'custom', message: 'Configure a chave do provedor (BREVO_API_KEY ou RESEND_API_KEY), EMAIL_FROM e APP_PUBLIC_URL em conjunto.' })
  if (env.NODE_ENV === 'production' && env.APP_PUBLIC_URL && !env.APP_PUBLIC_URL.startsWith('https://')) {
    ctx.addIssue({ code: 'custom', path: ['APP_PUBLIC_URL'], message: 'Produção exige HTTPS nos links de autenticação.' })
  }
  if (env.APP_PUBLIC_URL && !env.CORS_ORIGINS.includes(env.APP_PUBLIC_URL)) ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'Inclua APP_PUBLIC_URL entre as origens permitidas.' })
})

export type Environment = z.infer<typeof environmentSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Environment {
  return environmentSchema.parse(source)
}
