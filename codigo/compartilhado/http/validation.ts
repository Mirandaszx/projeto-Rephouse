import { z } from 'zod'
import type { Request, RequestHandler } from 'express'
import { Prisma } from '../../gerado/prisma/client.js'
import type { Actor } from '../context.js'

export const uuid = z.uuid()
export const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(value => new Prisma.Decimal(value).greaterThan(0))
export const dateOnly = z.iso.date().transform(value => new Date(`${value}T00:00:00.000Z`))
export const name = z.string().trim().min(1).max(120)
export const email = z.string().trim().toLowerCase().max(254).pipe(z.email())
export const password = z.string().min(8).max(128)

function jsonValue(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) return value.toFixed(2)
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(jsonValue)
  if (value && typeof value === 'object') {
    const fields = value as Record<string, unknown>
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const derived = fields.vencimento instanceof Date && (fields.status === 'PAGA' || fields.status === 'PENDENTE')
      ? { ...fields, statusCalculado: fields.status === 'PAGA' ? 'PAGA' : fields.vencimento.toISOString().slice(0,10) < today ? 'VENCIDA' : 'PENDENTE' } : fields
    // Defesa adicional ao select dos repositories: metadados internos não compõem DTOs públicos.
    return Object.fromEntries(Object.entries(derived).filter(([key]) => !['senhaHash','versaoToken','hashRequisicao','chaveIdempotencia'].includes(key))
      .map(([k,v]) => [k, k === 'comprovanteUrl' && v && typeof fields.id === 'string'
        ? `/api/pagamentos/${fields.id}/comprovante` : jsonValue(v)]))
  }
  return value
}

export const idParam = (req: Request, key = 'id'): string => uuid.parse(req.params[key])
export function endpoint(operation: (req: Request, actor: Actor) => Promise<unknown>, status = 200): RequestHandler {
  return async (req, res) => {
    const result = await operation(req, res.locals.actor as Actor)
    if (status === 204) { res.status(204).end(); return }
    res.status(status).json(jsonValue(result))
  }
}
