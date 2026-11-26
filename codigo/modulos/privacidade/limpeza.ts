import type { PrismaClient } from '../../gerado/prisma/client.js'

/**
 * LGPD (26/11/2026): apaga links de e-mail, desafios do Google e limites de envio vencidos há mais de um dia. São dados
 * que só existem para autenticar; depois de vencidos, não têm mais finalidade. A regra fica no banco
 * (rephouse_limpar_dados_vencidos), e a API só chama a função, sem permissão de DELETE nessas tabelas.
 */
export async function limparDadosVencidos(db: PrismaClient): Promise<number> {
  const [row] = await db.$queryRaw<{ total: number }[]>`SELECT rephouse_limpar_dados_vencidos() AS total`
  return Number(row?.total ?? 0)
}

const SEIS_HORAS = 6 * 60 * 60 * 1000

export function startPrivacyCleanup(db: PrismaClient, log: (event: Record<string, unknown>) => void, intervalo = SEIS_HORAS) {
  let running: Promise<void> | undefined, stopped = false
  const run = () => {
    if (stopped || running) return
    running = limparDadosVencidos(db)
      .then(removidos => { if (removidos) log({ event: 'privacy_cleanup', removidos }) })
      .catch(() => log({ event: 'privacy_cleanup_failed', code: 'PRIVACY_CLEANUP_FAILED' }))
      .finally(() => { running = undefined })
  }
  const timer = setInterval(run, intervalo); timer.unref(); run()
  return async () => { stopped = true; clearInterval(timer); await running }
}
