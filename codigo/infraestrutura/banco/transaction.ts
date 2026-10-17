import { setTimeout as aguardar } from 'node:timers/promises'
import { Prisma, type PrismaClient } from '../../gerado/prisma/client.js'

function conflitoTransitorio(erro: unknown): boolean {
  const pendentes: unknown[] = [erro]
  const visitados = new Set<object>()
  while (pendentes.length > 0) {
    const atual = pendentes.pop()
    if (!atual || typeof atual !== 'object' || visitados.has(atual)) continue
    visitados.add(atual)
    const dados = atual as Record<string, unknown>
    if ((typeof dados.code === 'string' && ['P2034', '40001', '40P01'].includes(dados.code))
      || (typeof dados.originalCode === 'string' && ['40001', '40P01'].includes(dados.originalCode))
      || dados.kind === 'TransactionWriteConflict') return true
    pendentes.push(dados.cause, dados.meta, dados.driverAdapterError)
  }
  return false
}

export interface TransactionOptions {
  maxTentativas?: number
}

// A callback pode ser repetida; efeitos externos ficam fora da transação.
export async function executarTransacaoAcid<T>(
  prisma: PrismaClient,
  operacao: (tx: Prisma.TransactionClient) => Promise<T>,
  { maxTentativas = 3 }: TransactionOptions = {},
): Promise<T> {
  if (!Number.isInteger(maxTentativas) || maxTentativas < 1 || maxTentativas > 5) {
    throw new Error('maxTentativas deve ser um inteiro entre 1 e 5.')
  }
  for (let tentativa = 1; ; tentativa += 1) {
    try {
      return await prisma.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL synchronous_commit = on`
        return operacao(tx)
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (erro: unknown) {
      if (!conflitoTransitorio(erro) || tentativa === maxTentativas) throw erro
      await aguardar(20 * 2 ** (tentativa - 1) + Math.floor(Math.random() * 20))
    }
  }
}
