import type { Prisma, PrismaClient, Usuario } from '../gerado/prisma/client.js'
import { executarTransacaoAcid } from '../infraestrutura/banco/transaction.js'
import { AuthRepository } from '../modulos/autenticacao/auth.repository.js'
import { AppError } from './http/app-error.js'

export interface Actor { id: string; versaoToken: number }
const users = new AuthRepository()

export function withActor<T>(db: PrismaClient, actor: Actor,
  operation: (tx: Prisma.TransactionClient, user: Usuario) => Promise<T>): Promise<T> {
  return executarTransacaoAcid(db, async tx => {
    const user = await users.buscarPorId(tx, actor.id)
    // Conferir dentro da mesma transação evita usar privilégios anteriores a logout/bloqueio.
    if (!user || !user.ativo || user.excluidoEm || user.versaoToken !== actor.versaoToken) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Sessão inválida ou encerrada.')
    }
    return operation(tx, user)
  })
}

export function requireMaster(user: Usuario): void {
  if (user.tipoUsuario !== 'USUARIO_MASTER') throw new AppError(403, 'FORBIDDEN', 'Acesso exclusivo de MASTER.')
}

export async function republicContext(tx: Prisma.TransactionClient, user: Usuario, explicitId?: string) {
  // Somente as rotas MASTER fornecem escopo explícito; as demais derivam o vínculo atual.
  if (explicitId) requireMaster(user)
  const member = explicitId ? null : await tx.membroRepublica.findFirst({ where: { usuarioId: user.id, ativo: true } })
  const id = explicitId ?? member?.republicaId
  if (!id) throw new AppError(409, 'NO_REPUBLIC', 'Entre em uma república para realizar esta operação.')
  const republic = await tx.republica.findUnique({ where: { id } })
  if (!republic) throw new AppError(404, 'NOT_FOUND', 'República não encontrada.')
  if (!republic.ativa) throw new AppError(403, 'REPUBLIC_BLOCKED', 'A república está bloqueada.')
  return republic
}

export function requireAdmin(user: Usuario, republic: { adminId: string }): void {
  if (user.tipoUsuario !== 'USUARIO_MASTER' && (user.tipoUsuario !== 'USUARIO_ADMIN' || republic.adminId !== user.id)) {
    throw new AppError(403, 'FORBIDDEN', 'A operação exige o administrador da república.')
  }
}
