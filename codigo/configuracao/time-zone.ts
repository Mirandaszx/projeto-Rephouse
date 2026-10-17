export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo'

export function appTimeZone(value = process.env.APP_TIME_ZONE ?? DEFAULT_TIME_ZONE): string {
  if (value !== 'UTC' && !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(value)) throw new Error('APP_TIME_ZONE deve ser um identificador IANA, como America/Sao_Paulo.')
  try { new Intl.DateTimeFormat('pt-BR', { timeZone: value }).format() }
  catch { throw new Error('APP_TIME_ZONE deve ser um identificador de fuso válido.') }
  return value
}

export function civilDate(date = new Date(), timeZone = appTimeZone()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
