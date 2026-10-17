import { z } from 'zod'
import type { RequestHandler } from 'express'
import type { FinanceiroService } from './financeiro.service.js'
import {prepareReceipt,paymentPublic,receiptTypes} from '../../infraestrutura/armazenamento/comprovantes.js'
import type { Actor } from '../../compartilhado/context.js'
import { dateOnly, endpoint, idParam, money, uuid } from '../../compartilhado/http/validation.js'
import {pagination} from '../../compartilhado/http/pagination.js'

const expenseSchema = z.object({ titulo: z.string().trim().min(1).max(160), categoria: z.string().trim().min(1).max(80),
  valorTotal: money, vencimento: dateOnly, membroIds: z.array(uuid).min(1) }).strict()

export function createFinanceiroController(service: FinanceiroService, master = false) {
  const scope = (req: Parameters<typeof idParam>[0]) => master ? idParam(req, 'republicaId') : undefined
  const pay: RequestHandler = async (req, res) => {
    const input = z.object({ rateioId: uuid, valor: money }).strict().parse(req.body)
    const chaveIdempotencia = uuid.parse(req.get('Idempotency-Key'))
    const comprovante = req.file ? await prepareReceipt(req.file.buffer) : undefined
    const payment = await service.pay(res.locals.actor as Actor, { ...input, chaveIdempotencia, comprovante })
      res.status(201).json({ id: payment.id, rateioId: payment.rateioId, membroId: payment.membroId,
        valor: payment.valor.toFixed(2), dataPagamento: payment.dataPagamento,
        comprovanteUrl: paymentPublic(payment).comprovanteUrl })
  }
  const receipt: RequestHandler = async (req, res) => {
    const file = await service.receipt(res.locals.actor as Actor, idParam(req))
    res.set({'X-Content-Type-Options':'nosniff','Content-Type':file.mimeType,'Content-Length':String(file.tamanho)})
    res.attachment(`comprovante.${receiptTypes[file.mimeType as keyof typeof receiptTypes]}`)
    res.send(Buffer.from(file.conteudo))
  }
  return {
    create: endpoint((req, actor) => service.create(actor, expenseSchema.parse(req.body), scope(req)), 201),
    list: endpoint((req, actor) => service.list(actor,pagination(req.query), scope(req))),
    detail: endpoint((req, actor) => service.detail(actor, idParam(req), scope(req))),
    edit: endpoint((req, actor) => service.edit(actor, idParam(req), expenseSchema.partial().parse(req.body), scope(req))),
    personal: endpoint((req, actor) => service.personal(actor,undefined,pagination(req.query))),
    personalDetail: endpoint((req, actor) => service.personal(actor, idParam(req))),
    pay, receipt,
  }
}
