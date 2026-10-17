import { randomBytes } from 'node:crypto'
import type { Prisma, PrismaClient, Usuario } from '../../gerado/prisma/client.js'
import { withActor, republicContext, requireAdmin, type Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { RepublicasRepository } from './republicas.repository.js'
import type { CriarRepublicaInput } from './republicas.types.js'

export function createRepublicasService(db: PrismaClient) {
  const repository = new RepublicasRepository()
  async function sair(tx: Prisma.TransactionClient, user: Usuario) {
    const member = await repository.ativo(tx, user.id)
    if (!member) throw new AppError(409, 'NO_REPUBLIC', 'Você não possui vínculo ativo.')
    if (member.republica.adminId === user.id) {
      throw new AppError(409, 'TRANSFER_ADMIN_REQUIRED', 'Escolha e transfira a administração antes de sair.')
    }
    // Não se apaga nem se desconecta usuario_id: ele autoriza o pagamento das dívidas antigas.
    await repository.desativar(tx, member.id)
  }
  async function entrar(tx: Prisma.TransactionClient, user: Usuario, codigo: string) {
    if (await repository.ativo(tx, user.id)) throw new AppError(409, 'ALREADY_MEMBER', 'Saia da república atual antes de entrar em outra.')
    const republic = await repository.porCodigo(tx, codigo)
    if (!republic || !republic.ativa) throw new AppError(404, 'NOT_FOUND', 'Código de entrada inválido ou indisponível.')
    return repository.vincular(tx, user.id, republic.id)
  }
  return {
    create: (actor: Actor, input: CriarRepublicaInput) => withActor(db, actor, async (tx, user) => {
      if (await repository.ativo(tx, user.id)) throw new AppError(409, 'ALREADY_MEMBER', 'Você já possui uma república ativa.')
      const republic = await repository.criar(tx, { ...input, adminId: user.id, codigoEntrada: randomBytes(8).toString('hex').toUpperCase() })
      await repository.perfil(tx, user.id, user.tipoUsuario === 'USUARIO_MASTER' ? 'USUARIO_MASTER' : 'USUARIO_ADMIN')
      await repository.vincular(tx, user.id, republic.id)
      return republic
    }),
    current: (actor: Actor, scope?: string) => withActor(db, actor, (tx, user) => republicContext(tx, user, scope)),
    edit: (actor: Actor, data: { nome?: string; endereco?: string | null }, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      requireAdmin(user, republic)
      return repository.editar(tx, republic.id, data)
    }),
    join: (actor: Actor, codigo: string) => withActor(db, actor, (tx, user) => entrar(tx, user, codigo)),
    leave: (actor: Actor) => withActor(db, actor, (tx, user) => sair(tx, user)),
    swap: (actor: Actor, codigo: string) => withActor(db, actor, async (tx, user) => {
      const current = await repository.ativo(tx, user.id)
      if (current?.republica.codigoEntrada === codigo) throw new AppError(409, 'SAME_REPUBLIC', 'Você já pertence a essa república.')
      // Se o novo código falhar, a desativação anterior também sofre rollback.
      await sair(tx, user)
      return entrar(tx, user, codigo)
    }),
    members: (actor: Actor, inativos: boolean, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      if (inativos) requireAdmin(user, republic)
      return repository.listar(tx, republic.id, inativos)
    }),
    deactivate: (actor: Actor, id: string, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      requireAdmin(user, republic)
      const member = await repository.membro(tx, id, republic.id)
      if (!member) throw new AppError(404, 'NOT_FOUND', 'Membro não encontrado.')
      if (member.usuarioId === republic.adminId) throw new AppError(409, 'TRANSFER_ADMIN_REQUIRED', 'Transfira a administração primeiro.')
      return repository.desativar(tx, id)
    }),
    transfer: (actor: Actor, membroId: string, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      requireAdmin(user, republic)
      const next = await repository.membro(tx, membroId, republic.id)
      if (!next || !next.usuario.ativo || next.usuario.excluidoEm) throw new AppError(404, 'NOT_FOUND', 'Substituto ativo não encontrado.')
      if (next.usuarioId === republic.adminId) throw new AppError(409, 'SAME_ADMIN', 'Escolha outro membro.')
      const previous = await repository.usuario(tx, republic.adminId)
      await repository.editar(tx, republic.id, { adminId: next.usuarioId })
      if (previous.tipoUsuario !== 'USUARIO_MASTER') await repository.perfil(tx, previous.id, 'USUARIO_NORMAL')
      if (next.usuario.tipoUsuario !== 'USUARIO_MASTER') await repository.perfil(tx, next.usuarioId, 'USUARIO_ADMIN')
      return { adminId: next.usuarioId }
    }),
  }
}
export type RepublicasService = ReturnType<typeof createRepublicasService>
