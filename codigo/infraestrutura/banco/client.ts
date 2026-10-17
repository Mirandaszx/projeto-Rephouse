import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '../../gerado/prisma/client.js'

export function createDatabase(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error('Configure DATABASE_URL no arquivo .env.')

  const schema = new URL(connectionString).searchParams.get('schema') ?? 'public'
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) throw new Error('Schema PostgreSQL inválido.')
  const adapter = new PrismaPg({ connectionString, connectionTimeoutMillis: 5000,
    options: `-c search_path=${schema}` }, { schema })
  return new PrismaClient({
    adapter,
    transactionOptions: {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    },
  })
}
