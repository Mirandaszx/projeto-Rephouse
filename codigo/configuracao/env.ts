import 'dotenv/config'
import { z } from 'zod'

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  JWT_SECRET: z.string().min(32),
  UPLOAD_DIR: z.string().min(1).default('armazenamento/comprovantes'),
  DATABASE_URL: z.url().refine(value => {
    const protocol = new URL(value).protocol
    return protocol === 'postgresql:' || protocol === 'postgres:'
  }, 'DATABASE_URL deve usar PostgreSQL.'),
})

export type Environment = z.infer<typeof environmentSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Environment {
  return environmentSchema.parse(source)
}
