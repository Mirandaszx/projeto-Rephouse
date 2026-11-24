import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import { openApiDocument } from '../../openapi.js'

const routes = Object.keys(openApiDocument.paths).map(path => ({ path,
  pattern: new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}/?$`) }))

export type LogSink = (event: Record<string, unknown>) => void
// Lista fechada: um campo novo só chega ao Kibana depois de entrar aqui, nunca por acidente.
const CAMPOS_PERMITIDOS = ['event', 'requestId', 'method', 'path', 'status', 'durationMs', 'category', 'code', 'recorrenciaId', 'port',
  'memoryRssMb', 'heapUsedMb', 'eventLoopUtilization', 'eventLoopDelayP99Ms'] as const
export function operationalLog(event: Record<string, unknown>): Record<string, unknown> {
  const timestamp = typeof event.timestamp === 'string' ? event.timestamp : new Date().toISOString()
  const level = event.event === 'error' || String(event.event).endsWith('_failed')
    || typeof event.status === 'number' && event.status >= 500 ? 'error'
    : typeof event.status === 'number' && event.status >= 400 ? 'warn' : 'info'
  // Somente campos operacionais seguros; não serializar Error, requisição, dados pessoais ou ambiente.
  const seguros = Object.fromEntries(CAMPOS_PERMITIDOS.filter(campo => event[campo] !== undefined).map(campo => [campo, event[campo]]))
  return { ...seguros, timestamp, '@timestamp': timestamp,
    'log.level': level, 'service.name': 'rephouse-api', 'service.version': openApiDocument.info.version,
    'service.environment': process.env.NODE_ENV ?? 'development' }
}
export const stdoutLog: LogSink = event => { process.stdout.write(`${JSON.stringify(operationalLog(event))}\n`) }

export function requestLog(write: LogSink = stdoutLog): RequestHandler {
  return (req, res, next) => {
    // Gerado no servidor: o cliente não consegue injetar identificadores nos logs.
    const requestId = randomUUID()
    res.locals.requestId=requestId
    res.locals.log=write
    const start = performance.now()
    res.setHeader('X-Request-Id', requestId)
    let recorded = false
    const record = () => {
      if (recorded) return
      recorded = true
      // Somente o padrão da rota registrada. URL livre, query e dados não entram no log.
      const path = routes.find(route => route.pattern.test(req.originalUrl.split('?')[0]!))?.path ?? 'unmatched'
      write({ timestamp: new Date().toISOString(), event: 'http', requestId,
        method: req.method, path,
        status: res.writableFinished ? res.statusCode : 499,
        durationMs: Math.round((performance.now() - start) * 100) / 100 })
    }
    res.once('finish', record)
    res.once('close', record)
    next()
  }
}
