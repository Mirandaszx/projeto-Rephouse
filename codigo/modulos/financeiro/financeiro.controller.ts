import { z } from 'zod'
import type { RequestHandler } from 'express'
import type { FinanceiroService } from './financeiro.service.js'
import type { ReceiptStore } from '../../infraestrutura/armazenamento/receipts.js'
import type { Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { dateOnly, endpoint, idParam, money, uuid } from '../../compartilhado/http/validation.js'

const expenseSchema = z.object({ titulo: z.string().trim().min(1).max(160), categoria: z.string().trim().min(1).max(80),
  valorTotal: money, vencimento: dateOnly, membroIds: z.array(uuid).min(1) }).strict()

export function createFinanceiroController(service: FinanceiroService, receipts: ReceiptStore, master = false) {
  const scope = (req: Parameters<typeof idParam>[0]) => master ? idParam(req, 'republicaId') : undefined
  const pay: RequestHandler = async (req, res) => {
    const input = z.object({ rateioId: uuid, valor: money }).strict().parse(req.body)
    const chaveIdempotencia = uuid.parse(req.get('Idempotency-Key'))
    // Arquivo é escrito uma vez, fora da callback do retry transacional.
    const file = req.file ? await receipts.save(req.file) : undefined
    try {
      const payment = await service.pay(res.locals.actor as Actor, { ...input, chaveIdempotencia,
        comprovanteUrl: file?.name, arquivoHash: file?.hash })
      if (file && payment.comprovanteUrl !== file.name) await receipts.remove(file.name)
      res.status(201).json({ id: payment.id, rateioId: payment.rateioId, membroId: payment.membroId,
        valor: payment.valor.toFixed(2), dataPagamento: payment.dataPagamento,
        comprovanteUrl: payment.comprovanteUrl ? `/api/pagamentos/${payment.id}/comprovante` : null })
    } catch (error) {
      // Somente falhas de negócio confirmadas permitem apagar o arquivo imediatamente.
      // Em erro de conexão/commit desconhecido, preservar evita destruir um comprovante já referenciado.
      if (file && error instanceof AppError) await receipts.remove(file.name)
      throw error
    }
  }
  const receipt: RequestHandler = async (req, res) => {
    const file = await service.receipt(res.locals.actor as Actor, idParam(req))
    res.set('X-Content-Type-Options', 'nosniff')
    res.download(receipts.path(file), `comprovante.${file.split('.').at(-1)}`)
  }
  return {
    create: endpoint((req, actor) => service.create(actor, expenseSchema.parse(req.body), scope(req)), 201),
    list: endpoint((req, actor) => service.list(actor, scope(req))),
    detail: endpoint((req, actor) => service.detail(actor, idParam(req), scope(req))),
    edit: endpoint((req, actor) => service.edit(actor, idParam(req), expenseSchema.partial().parse(req.body), scope(req))),
    personal: endpoint((_req, actor) => service.personal(actor)),
    personalDetail: endpoint((req, actor) => service.personal(actor, idParam(req))),
    pay, receipt,
  }
}
