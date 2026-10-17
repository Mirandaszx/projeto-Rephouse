import type { PrismaClient, StatusTarefa } from '../../gerado/prisma/client.js'
import { withActor, republicContext, requireAdmin, type Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { TarefasRepository } from './tarefas.repository.js'
import type { CriarTarefaInput } from './tarefas.types.js'
import {pageResult,type PageInput} from '../../compartilhado/http/pagination.js'

export function createTarefasService(db: PrismaClient) {
  const repository = new TarefasRepository()
  return {
    list: (actor: Actor,page:PageInput, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      return pageResult(await repository.listar(tx,republic.id,page),await repository.contar(tx,republic.id),page)
    }),
    create: (actor: Actor, input: CriarTarefaInput, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      requireAdmin(user, republic)
      if (!await repository.responsavelAtivo(tx, input.responsavelId, republic.id)) throw new AppError(400, 'INVALID_RESPONSIBLE', 'Selecione um membro ativo da própria república.')
      return repository.criar(tx, { ...input, republicaId: republic.id })
    }),
    edit: (actor: Actor, id: string, input: Partial<CriarTarefaInput> & { status?: StatusTarefa }, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      const task = await repository.buscar(tx, id, republic.id)
      if (!task) throw new AppError(404, 'NOT_FOUND', 'Tarefa não encontrada.')
      const admin = republic.adminId === user.id || user.tipoUsuario === 'USUARIO_MASTER'
      if (!admin && (task.responsavel.usuarioId !== user.id || !task.responsavel.ativo
        || Object.keys(input).some(key => key !== 'status') || input.status !== 'CONCLUIDA')) {
        throw new AppError(403, 'FORBIDDEN', 'Você pode apenas concluir tarefas atribuídas a você.')
      }
      if (input.responsavelId && !await repository.responsavelAtivo(tx, input.responsavelId, republic.id)) throw new AppError(400, 'INVALID_RESPONSIBLE', 'Selecione um membro ativo da própria república.')
      return repository.editar(tx, id, input)
    }),
  }
}
export type TarefasService = ReturnType<typeof createTarefasService>
