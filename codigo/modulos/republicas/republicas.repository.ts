import type { Prisma } from '../../gerado/prisma/client.js'

export class RepublicasRepository {
  editar(tx: Prisma.TransactionClient, id: string, data: Prisma.RepublicaUncheckedUpdateInput) {
    return tx.republica.update({ where: { id }, data })
  }
  usuario(tx: Prisma.TransactionClient, id: string) {
    return tx.usuario.findUniqueOrThrow({ where: { id }, select: { id: true, tipoUsuario: true } })
  }
  perfil(tx: Prisma.TransactionClient, id: string, tipoUsuario: 'USUARIO_NORMAL' | 'USUARIO_ADMIN' | 'USUARIO_MASTER') {
    return tx.usuario.update({ where: { id }, data: { tipoUsuario } })
  }
  membro(tx: Prisma.TransactionClient, id: string, republicaId: string) {
    return tx.membroRepublica.findFirst({ where: { id, republicaId, ativo: true }, include: { usuario: {
      select: { id: true, ativo: true, excluidoEm: true, tipoUsuario: true },
    } } })
  }
  desativar(tx: Prisma.TransactionClient, id: string) {
    return tx.membroRepublica.update({ where: { id }, data: { ativo: false } })
  }
  ativo(tx: Prisma.TransactionClient, usuarioId: string) {
    return tx.membroRepublica.findFirst({ where: { usuarioId, ativo: true }, include: { republica: true } })
  }
  porCodigo(tx: Prisma.TransactionClient, codigoEntrada: string) {
    return tx.republica.findUnique({ where: { codigoEntrada } })
  }
  criar(tx: Prisma.TransactionClient, data: { nome: string; endereco?: string; codigoEntrada: string; adminId: string }) {
    return tx.republica.create({ data })
  }
  vincular(tx: Prisma.TransactionClient, usuarioId: string, republicaId: string) {
    // Reentrar na mesma casa reutiliza a identidade histórica do vínculo.
    return tx.membroRepublica.upsert({ where: { usuarioId_republicaId: { usuarioId, republicaId } },
      create: { usuarioId, republicaId }, update: { ativo: true } })
  }
  listar(tx: Prisma.TransactionClient, republicaId: string, inativos: boolean) {
    return tx.membroRepublica.findMany({ where: { republicaId, ...(inativos ? {} : { ativo: true }) },
      include: { usuario: { select: { id: true, nome: true, email: true } } }, orderBy: { entrouEm: 'asc' } })
  }
}
