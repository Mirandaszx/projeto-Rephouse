import type { PrismaClient } from '../../gerado/prisma/client.js'
import { withActor, requireMaster, type Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { MasterRepository } from './master.repository.js'
import { DashboardRepository } from '../painel/dashboard.repository.js'
import {pageResult,type PageInput} from '../../compartilhado/http/pagination.js'
export function createMasterService(db: PrismaClient) {
  const repository = new MasterRepository()
  return {
    users: (actor: Actor,page:PageInput) => withActor(db, actor, async(tx, user) => { requireMaster(user); return pageResult(await repository.users(tx,page),await repository.contarUsuarios(tx),page) }),
    republics: (actor: Actor,page:PageInput) => withActor(db, actor, async(tx, user) => { requireMaster(user); return pageResult(await repository.republics(tx,page),await repository.contarRepublicas(tx),page) }),
    dashboard: (actor: Actor) => withActor(db, actor, async (tx, user) => {
      requireMaster(user)
      return { ...await new DashboardRepository().resumo(tx), usuarios: await repository.contarUsuarios(tx), republicas: await repository.contarRepublicas(tx) }
    }),
    userStatus: (actor: Actor, id: string, ativo: boolean) => withActor(db, actor, async (tx, user) => {
      requireMaster(user)
      const target = await repository.usuario(tx, id)
      if (!target) throw new AppError(404, 'NOT_FOUND', 'Usuário não encontrado.')
      if (target.excluidoEm) throw new AppError(409, 'ACCOUNT_DELETED', 'Conta excluída não pode ser reativada.')
      if (!ativo && target.tipoUsuario === 'USUARIO_MASTER' && await repository.outrosMasters(tx, id) === 0) {
        throw new AppError(409, 'LAST_MASTER', 'O último MASTER ativo não pode ser bloqueado.')
      }
      return repository.statusUsuario(tx, id, ativo)
    }),
    republicStatus: (actor: Actor, id: string, ativa: boolean) => withActor(db, actor, async (tx, user) => {
      requireMaster(user)
      return repository.statusRepublica(tx, id, ativa)
    }),
  }
}
