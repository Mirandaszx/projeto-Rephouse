import type { Prisma } from '../../gerado/prisma/client.js'

export const publicUserSelect = {
  id: true, nome: true, email: true, tipoUsuario: true, ativo: true, criadoEm: true,
} as const

export class AuthRepository {
  vinculoAtual(tx: Prisma.TransactionClient, usuarioId: string) {
    return tx.membroRepublica.findFirst({ where: { usuarioId, ativo: true }, include: { republica: true } })
  }
  editarNome(tx: Prisma.TransactionClient, id: string, nome: string) {
    return tx.usuario.update({ where: { id }, data: { nome }, select: publicUserSelect })
  }
  invalidarTokens(tx: Prisma.TransactionClient, id: string) {
    return tx.usuario.update({ where: { id }, data: { versaoToken: { increment: 1 } } })
  }
  administra(tx: Prisma.TransactionClient, usuarioId: string) { return tx.republica.count({ where: { adminId: usuarioId } }) }
  dividas(tx: Prisma.TransactionClient, usuarioId: string) {
    return tx.rateioDespesa.count({ where: { membro: { usuarioId }, status: { not: 'PAGO' } } })
  }
  outrosMasters(tx: Prisma.TransactionClient, id: string) {
    return tx.usuario.count({ where: { tipoUsuario: 'USUARIO_MASTER', ativo: true, excluidoEm: null, id: { not: id } } })
  }
  encerrarVinculos(tx: Prisma.TransactionClient, usuarioId: string) {
    return tx.membroRepublica.updateMany({ where: { usuarioId, ativo: true }, data: { ativo: false } })
  }
  excluir(tx: Prisma.TransactionClient, id: string) {
    return tx.usuario.update({ where: { id }, data: { ativo: false, excluidoEm: new Date(), versaoToken: { increment: 1 } } })
  }
  buscarPorEmail(tx: Prisma.TransactionClient, email: string) {
    return tx.usuario.findUnique({ where: { email } })
  }
  buscarPorId(tx: Prisma.TransactionClient, id: string) {
    return tx.usuario.findUnique({ where: { id } })
  }
  criar(tx: Prisma.TransactionClient, data: { nome: string; email: string; senhaHash: string }) {
    // O perfil não vem da requisição; o default do banco é sempre NORMAL.
    return tx.usuario.create({ data })
  }
}
