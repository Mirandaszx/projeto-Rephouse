import type { Prisma, PrismaClient, StatusTarefa, Tarefa, Usuario } from '../../gerado/prisma/client.js'
import { withActor, republicContext, type Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { TarefasRepository } from './tarefas.repository.js'
import type { CriarTarefaInput } from './tarefas.types.js'
import {pageResult,type PageInput} from '../../compartilhado/http/pagination.js'
import { executarCriacao } from '../../compartilhado/idempotencia-criacao.js'
import { notifyTask } from '../notificacoes/notificacoes.service.js'

const forbidden = () => new AppError(403, 'FORBIDDEN', 'Você não tem permissão para alterar esta tarefa.')
function taskView(task: Tarefa & { responsavel?: { ativo: boolean; usuario: { ativo: boolean; excluidoEm: Date | null } } | null }) {
  const { versao: _versao, responsavel, ...data } = task
  return { ...data, responsavelAtivo: task.responsavelId ? responsavel ? responsavel.ativo && responsavel.usuario.ativo && !responsavel.usuario.excluidoEm : true : null }
}
const isAdmin = (user: Usuario, house: { adminId: string }) => house.adminId === user.id || user.tipoUsuario === 'USUARIO_MASTER'

export function createTarefasService(db: PrismaClient) {
  const repository = new TarefasRepository()
  async function assignment(tx: Prisma.TransactionClient, user: Usuario, republicaId: string, responsible?: string | null) {
    const house = await tx.republica.findUniqueOrThrow({ where: { id: republicaId } })
    if (!responsible) return
    const member = await repository.responsavelAtivo(tx, responsible, republicaId)
    if (!member) throw new AppError(400, 'INVALID_RESPONSIBLE', 'Selecione um membro ativo da própria república.')
    if (!isAdmin(user, house) && member.usuarioId !== user.id) throw forbidden()
  }
  async function find(tx: Prisma.TransactionClient, id: string, republicaId: string) {
    const task = await repository.buscar(tx, id, republicaId)
    if (!task) throw new AppError(404, 'NOT_FOUND', 'Tarefa não encontrada.')
    return task
  }
  return {
    list: (actor: Actor,page:PageInput, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      return pageResult((await repository.listar(tx,republic.id,page)).map(taskView),await repository.contar(tx,republic.id),page)
    }),
    get: (actor: Actor, id: string, scope?: string) => withActor(db, actor, async (tx, user) => taskView(await find(tx, id, (await republicContext(tx, user, scope)).id))),
    create: (actor: Actor, input: CriarTarefaInput, scope?: string, key?: string) => executarCriacao(db, actor, 'TAREFA', key, scope,
      // Preserva hashes antigos: campos internos não integram o corpo normalizado.
      [input.titulo, input.responsavelId ?? null, input.descricao ?? null, input.prazo?.toISOString().slice(0,10) ?? null], async (tx, user, republicaId) => {
        const task = await repository.criar(tx, { ...input, responsavelId: input.responsavelId ?? null, republicaId, criadorId: user.id })
        await notifyTask(tx, task, user.id, 'TAREFA_CRIADA')
        return taskView(task)
      }, (tx, user, republicaId) => assignment(tx, user, republicaId, input.responsavelId)),
    edit: (actor: Actor, id: string, input: Partial<CriarTarefaInput> & { status?: StatusTarefa }, scope?: string) => withActor(db, actor, async (tx, user) => {
      const republic = await republicContext(tx, user, scope)
      const task = await find(tx, id, republic.id)
      const admin = isAdmin(user, republic)
      const own = task.responsavel?.usuarioId === user.id && task.responsavel.ativo
      const keys = Object.keys(input)
      if (!admin) {
        const ownStatus = own && keys.every(key => key === 'status')
        const creatorText = task.criadorId === user.id && task.responsavelId === null && task.status === 'ABERTA' && keys.every(key => ['titulo','descricao','prazo'].includes(key))
        if (!ownStatus && !creatorText) throw forbidden()
      }
      if (input.responsavelId && !await repository.responsavelAtivo(tx, input.responsavelId, republic.id)) throw new AppError(400, 'INVALID_RESPONSIBLE', 'Selecione um membro ativo da própria república.')
      const responsible = input.responsavelId === undefined ? task.responsavelId : input.responsavelId
      const status = input.status ?? task.status
      if (status === 'CONCLUIDA' && !responsible) throw new AppError(409, 'TASK_NOT_ASSIGNED', 'Assuma ou atribua a tarefa antes de concluir.')
      const changed = Object.entries(input).some(([key, value]) => {
        const before = task[key as keyof CriarTarefaInput | 'status']
        return value instanceof Date ? value.getTime() !== (before instanceof Date ? before.getTime() : null) : value !== before
      })
      if (!changed) return taskView(task)
      const updated = await repository.editar(tx, id, { ...input, versao: { increment: 1 } })
      if (responsible !== task.responsavelId) await notifyTask(tx, updated, user.id, responsible ? 'TAREFA_REATRIBUIDA' : 'TAREFA_LIBERADA')
      if (status !== task.status) await notifyTask(tx, updated, user.id, status === 'CONCLUIDA' ? 'TAREFA_CONCLUIDA' : 'TAREFA_REABERTA')
      return taskView(await find(tx, id, republic.id))
    }),
    assume: (actor: Actor, id: string, scope?: string) => withActor(db, actor, async (tx, user) => {
      const house = await republicContext(tx, user, scope)
      const member = await tx.membroRepublica.findFirst({ where: { usuarioId: user.id, republicaId: house.id, ativo: true } })
      if (!member) throw forbidden()
      const task = await find(tx, id, house.id)
      if (task.status !== 'ABERTA') throw new AppError(409, 'TASK_NOT_OPEN', 'Reabra a tarefa antes de assumir.')
      if (task.responsavelId === member.id) return taskView(task)
      if (task.responsavelId) throw new AppError(409, 'TASK_ALREADY_ASSIGNED', 'Outro morador já assumiu esta tarefa.')
      const updated = await repository.editar(tx, id, { responsavelId: member.id, versao: { increment: 1 } })
      await notifyTask(tx, updated, user.id, 'TAREFA_ASSUMIDA')
      return taskView(updated)
    }),
    release: (actor: Actor, id: string, scope?: string) => withActor(db, actor, async (tx, user) => {
      const house = await republicContext(tx, user, scope)
      const task = await find(tx, id, house.id)
      if (!isAdmin(user, house) && !(task.responsavel?.usuarioId === user.id && task.responsavel.ativo)) throw forbidden()
      if (task.status !== 'ABERTA') throw new AppError(409, 'TASK_NOT_OPEN', 'Reabra a tarefa antes de liberar.')
      if (!task.responsavelId) return taskView(task)
      const updated = await repository.editar(tx, id, { responsavelId: null, versao: { increment: 1 } })
      await notifyTask(tx, updated, user.id, 'TAREFA_LIBERADA')
      return taskView(updated)
    }),
  }
}
export type TarefasService = ReturnType<typeof createTarefasService>
