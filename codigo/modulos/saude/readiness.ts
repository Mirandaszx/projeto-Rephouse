import pg from 'pg'

export interface ReadinessProbe { check(): Promise<void>; close(): Promise<void> }

export function createReadinessProbe(connectionString: string): ReadinessProbe {
  // Pool exclusivo e pequeno: a verificação não espera vagas do pool transacional.
  const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 1200,
    query_timeout: 1200, statement_timeout: 1000, idleTimeoutMillis: 1000 })
  pool.on('error', () => { /* A rota reporta indisponibilidade sem expor a conexão. */ })
  return { async check() { await pool.query('SELECT 1') }, async close() { await pool.end() } }
}

export async function isReady(check?: () => Promise<unknown>): Promise<boolean> {
  if (!check) return false
  let timer: NodeJS.Timeout | undefined
  try {
    // Reserva margem para serialização e HTTP dentro do orçamento de dois segundos.
    return await Promise.race([check().then(() => true), new Promise<false>(resolve => {
      timer = setTimeout(() => resolve(false), 1500)
    })])
  } catch { return false } finally { clearTimeout(timer) }
}
