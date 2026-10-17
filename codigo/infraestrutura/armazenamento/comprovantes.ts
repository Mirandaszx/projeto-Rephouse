import { createHash } from 'node:crypto'
import { fileTypeFromBuffer } from 'file-type'
import { AppError } from '../../compartilhado/http/app-error.js'

export const receiptTypes = { 'application/pdf':'pdf', 'image/png':'png', 'image/jpeg':'jpg', 'image/webp':'webp' } as const
export interface ReceiptInput { conteudo: Uint8Array<ArrayBuffer>; mimeType: string; tamanho: number; hashSha256: string }

// Preparação sem escrita em disco: o mesmo buffer pode ser usado nos retries.
export async function prepareReceipt(buffer: Buffer): Promise<ReceiptInput> {
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new AppError(400,'INVALID_FILE','O comprovante deve conter entre 1 byte e 5 MiB.')
  const type = await fileTypeFromBuffer(buffer).catch(()=>undefined)
  if (!type || !(type.mime in receiptTypes)) throw new AppError(400,'INVALID_FILE','Envie PDF, PNG, JPEG ou WEBP válido.')
  return { conteudo: new Uint8Array(buffer), mimeType: type.mime, tamanho: buffer.length, hashSha256: createHash('sha256').update(buffer).digest('hex') }
}

export function paymentPublic<T extends { id: string; comprovanteUrl: string | null; comprovante?: { pagamentoId: string } | null }>(payment: T) {
  const { comprovante: reference, comprovanteUrl: legacy, ...fields } = payment
  return { ...fields, comprovanteUrl: reference || legacy ? `/api/pagamentos/${payment.id}/comprovante` : null }
}
