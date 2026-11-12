import type { components } from '../../../integracao/api'

export type Schemas = components['schemas']
export type Account = Schemas['MinhaConta']
export type House = Schemas['Republica']
export type Member = Schemas['MembroListado']
export type ExpenseDetail = Schemas['Despesa']
export type PersonalShare = Schemas['RateioPessoal']
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.'
export const civilDate = (value: string) => value.slice(0, 10).split('-').reverse().join('/')
export const balance = (share: { valorDevido: string; valorPago: string }) => Math.max(0, Math.round(Number(share.valorDevido) * 100) - Math.round(Number(share.valorPago) * 100)) / 100
