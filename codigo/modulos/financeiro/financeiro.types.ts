import type { Prisma } from '../../gerado/prisma/client.js'
import type { ReceiptInput } from '../../infraestrutura/armazenamento/comprovantes.js'

export interface CriarDespesaInput {
  republicaId: string
  criadaPorId: string
  titulo: string
  categoria: string
  valorTotal: string
  vencimento: Date
  membroIds: readonly string[]
}

export interface RegistrarPagamentoInput {
  rateioId: string
  membroId: string
  comprovanteUrl?: string
  comprovante?: ReceiptInput
  valor?: string
  chaveIdempotencia?: string
  hashRequisicao?: string
}

export type DespesaComRateios = Prisma.DespesaGetPayload<{ include: { rateios: true } }>
