import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import { openApiDocument } from '../../openapi.js'

const routes = Object.keys(openApiDocument.paths).map(path => ({ path,
  pattern: new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}/?$`) }))

export type LogSink = (event: Record<string, unknown>) => void
export const stdoutLog: LogSink = event => { process.stdout.write(`${JSON.stringify(event)}\n`) }

export function requestLog(write: LogSink = stdoutLog): RequestHandler {
  return (req, res, next) => {
    // Gerado no servidor: o cliente não consegue injetar identificadores nos logs.
    const requestId = randomUUID()
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
