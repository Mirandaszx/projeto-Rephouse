import { eventLoopUtilization, monitorEventLoopDelay } from 'node:perf_hooks'
import type { LogSink } from '../../compartilhado/http/request-log.js'

const mb = (bytes: number) => Math.round(bytes / 1048576 * 10) / 10

/**
 * Quarto sinal dourado (saturação): uma amostra por intervalo com memória do processo
 * e ocupação do event loop. Latência, tráfego e erros já saem do log de cada requisição.
 */
export function startSaturationSampler(write: LogSink, intervalMs = 60_000): () => void {
  const atraso = monitorEventLoopDelay({ resolution: 20 })
  atraso.enable()
  let anterior = eventLoopUtilization()
  const timer = setInterval(() => {
    const atual = eventLoopUtilization()
    const ocupacao = eventLoopUtilization(atual, anterior).utilization
    anterior = atual
    const { rss, heapUsed } = process.memoryUsage()
    // percentile() vem em nanossegundos; antes da primeira medição o histograma devolve NaN.
    const p99 = atraso.percentile(99)
    write({ event: 'runtime', memoryRssMb: mb(rss), heapUsedMb: mb(heapUsed),
      eventLoopUtilization: Math.round(ocupacao * 1000) / 1000,
      eventLoopDelayP99Ms: Number.isFinite(p99) ? Math.round(p99 / 1e4) / 100 : 0 })
    atraso.reset()
  }, intervalMs)
  // Não segura o processo vivo no desligamento.
  timer.unref()
  return () => { clearInterval(timer); atraso.disable() }
}
