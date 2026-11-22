import { createHash } from 'node:crypto'
import { Prisma, type PrismaClient, type Usuario } from '../gerado/prisma/client.js'
import { withActor, republicContext, requireAdmin, type Actor } from './context.js'
import { AppError } from './http/app-error.js'
import { jsonValue } from './http/validation.js'

type PublicJson<T> = T extends Date | Prisma.Decimal ? string : T extends readonly (infer U)[] ? PublicJson<U>[]
  : T extends object ? { [K in keyof T]: PublicJson<T[K]> } : T
type Kind = 'DESPESA' | 'TAREFA'
type Creation<T> = (tx: Prisma.TransactionClient, user: Usuario, republicaId: string) => Promise<T>

// Só a colisão desta identidade permite recuperar a operação em outra transação.
function keyCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false
  const queue: unknown[] = [error.meta], seen = new Set<object>()
  while (queue.length && seen.size < 32) {
    const value = queue.pop()
    if (!value || typeof value !== 'object' || seen.has(value)) continue
    seen.add(value)
    const data = value as Record<string, unknown>
    for (const name of ['constraint', 'constraint_name', 'constraintName', 'target', 'index']) {
      if (data[name] === 'operacoes_criacao_pkey') return true
    }
    for (const name of ['target', 'fields']) {
      const fields = data[name]
      if (Array.isArray(fields) && fields.length === 3 && ['usuario_id', 'operacao', 'chave'].every(field => fields.includes(field))) return true
    }
    for (const name of ['cause', 'constraint', 'driverAdapterError']) queue.push(data[name])
  }
  return false
}

/** Efeitos de domínio e registro do resultado confirmam ou revertem juntos. */
export async function executarCriacao<T extends { id: string }>(db: PrismaClient, actor: Actor,
  kind: Kind, key: string | undefined, scope: string | undefined, normalized: unknown, create: Creation<T>,
  authorize?: (tx: Prisma.TransactionClient, user: Usuario, republicaId: string) => Promise<void>): Promise<PublicJson<T>> {
  const operation = () => withActor(db, actor, async (tx, user) => {
    const house = await republicContext(tx, user, scope)
    // Despesas continuam administrativas; tarefas podem ser criadas por moradores.
    if (kind === 'DESPESA') requireAdmin(user, house)
    await authorize?.(tx, user, house.id)
    const hash = createHash('sha256').update(JSON.stringify([house.id, normalized])).digest('hex')
    if (key) {
      const previous = await tx.operacaoCriacao.findUnique({ where: { usuarioId_operacao_chave: { usuarioId: user.id, operacao: kind, chave: key } } })
      if (previous) {
        if (previous.republicaId !== house.id || previous.hashRequisicao !== hash) {
          throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'A chave já foi usada com outros dados.')
        }
        return previous.resposta as PublicJson<T>
      }
    }
    const created = await create(tx, user, house.id)
    const response = jsonValue(created) as PublicJson<T>
    if (key) await tx.operacaoCriacao.create({ data: { usuarioId: user.id, republicaId: house.id,
      operacao: kind, chave: key, hashRequisicao: hash,
      ...(kind === 'DESPESA' ? { despesaId: created.id } : { tarefaId: created.id }),
      resposta: response as Prisma.InputJsonValue } })
    return response
  })
  try { return await operation() }
  catch (error) { if (key && keyCollision(error)) return operation(); throw error }
}
