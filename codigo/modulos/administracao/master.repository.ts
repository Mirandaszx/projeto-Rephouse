import type { Prisma } from '../../gerado/prisma/client.js'
import { publicUserSelect } from '../autenticacao/auth.repository.js'
export class MasterRepository {
  usuario(tx: Prisma.TransactionClient, id: string) { return tx.usuario.findUnique({ where: { id } }) }
  outrosMasters(tx: Prisma.TransactionClient, id: string) {
    return tx.usuario.count({ where: { tipoUsuario: 'USUARIO_MASTER', ativo: true, excluidoEm: null, id: { not: id } } })
  }
  contarUsuarios(tx: Prisma.TransactionClient) { return tx.usuario.count() }
  contarRepublicas(tx: Prisma.TransactionClient) { return tx.republica.count() }
  statusUsuario(tx: Prisma.TransactionClient, id: string, ativo: boolean) {
    return tx.usuario.update({ where: { id }, data: { ativo, versaoToken: { increment: 1 } }, select: publicUserSelect })
  }
  statusRepublica(tx: Prisma.TransactionClient, id: string, ativa: boolean) { return tx.republica.update({ where: { id }, data: { ativa } }) }
  users(tx: Prisma.TransactionClient) { return tx.usuario.findMany({ select: { ...publicUserSelect, excluidoEm: true } }) }
  republics(tx: Prisma.TransactionClient) { return tx.republica.findMany({ orderBy: { criadaEm: 'desc' } }) }
}
