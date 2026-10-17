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
  JWT_SECRET: z.string().min(32),
  UPLOAD_DIR: z.string().min(1).default('armazenamento/comprovantes'),
  CORS_ORIGINS: z.string().default('').transform(value => value.split(',').map(origin => origin.trim()).filter(Boolean))
    .pipe(z.array(z.url().refine(value => {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) && url.origin === value
    }, 'Informe origens HTTP(S) completas, sem caminho, separadas por vírgula.'))),
  DATABASE_URL: z.url().refine(value => {
    const protocol = new URL(value).protocol
    return protocol === 'postgresql:' || protocol === 'postgres:'
  }, 'DATABASE_URL deve usar PostgreSQL.'),
})

export type Environment = z.infer<typeof environmentSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Environment {
  return environmentSchema.parse(source)
}
