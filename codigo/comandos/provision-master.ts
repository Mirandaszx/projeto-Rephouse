import { z } from 'zod'
import { createDatabase } from '../infraestrutura/banco/client.js'
import { executarTransacaoAcid } from '../infraestrutura/banco/transaction.js'

const email = z.email().parse(process.argv[process.argv.indexOf('--email') + 1]?.trim().toLowerCase())
const db = createDatabase()
try {
  await executarTransacaoAcid(db, async tx => {
    const user = await tx.usuario.findUnique({ where: { email } })
    if (!user?.ativo || user.excluidoEm) throw new Error('Cadastre primeiro uma conta ativa com esse e-mail.')
    await tx.usuario.update({ where: { id: user.id }, data: { tipoUsuario: 'USUARIO_MASTER', versaoToken: { increment: 1 } } })
  })
  console.log('MASTER provisionado. Faça login novamente para obter um token válido.')
} finally { await db.$disconnect() }
