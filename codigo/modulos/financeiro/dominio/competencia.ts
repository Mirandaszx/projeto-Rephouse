import { z } from 'zod'
import { civilDate } from '../../../configuracao/time-zone.js'

export const DIAS_PROXIMO_VENCIMENTO = 7
export const competenciaSchema = z.string().regex(/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/)
export const situacaoSchema = z.enum(['TODAS', 'PENDENTES', 'PROXIMAS', 'ATRASADAS', 'PAGAS'])
export const financialQueryShape = {
  competencia: competenciaSchema.optional(), situacao: situacaoSchema.optional(),
  escopo: z.enum(['CASA', 'PESSOAL']).optional(),
}
export type FinancialFilter = { competencia?: string; situacao?: z.infer<typeof situacaoSchema>; escopo?: 'CASA' | 'PESSOAL' }
export const monthDate = (month: string) => new Date(`${month}-01T00:00:00.000Z`)
export function nextMonth(month: string): string {
  const date = monthDate(month)
  date.setUTCMonth(date.getUTCMonth() + 1)
  return date.toISOString().slice(0, 7)
}
export function dueDate(month: string, day: number): Date {
  const date = monthDate(nextMonth(month))
  date.setUTCDate(0)
  date.setUTCDate(Math.min(day, date.getUTCDate()))
  return date
}
export function addDays(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}
export function dueState(due: Date, pending: boolean, today = civilDate()) {
  const day = due.toISOString().slice(0, 10)
  if (!pending) return 'QUITADA' as const
  if (day < today) return 'ATRASADA' as const
  if (day === today) return 'VENCE_HOJE' as const
  if (day <= addDays(today, DIAS_PROXIMO_VENCIMENTO)) return 'VENCE_EM_BREVE' as const
  return 'EM_DIA' as const
}
