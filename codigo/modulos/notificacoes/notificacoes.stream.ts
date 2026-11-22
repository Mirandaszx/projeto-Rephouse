import pg from 'pg'
import type { RequestHandler, Response } from 'express'
import type { Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import type { createNotificationsService } from './notificacoes.service.js'

/** Uma conexão PostgreSQL por instância, compartilhada por todos os navegadores. */
export function createNotificationsSignal(databaseUrl: string, log: (event: Record<string, unknown>) => void) {
  const listeners = new Set<() => void>()
  let client: pg.Client | undefined, retry: NodeJS.Timeout | undefined, stopped = false
  const wake = () => { for (const listener of listeners) listener() }
  const connect = async () => {
    if (stopped) return
    const connection = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 })
    client = connection
    const failed = () => {
      if (client !== connection || stopped) return
      client = undefined
      void connection.end().catch(() => {})
      log({ event: 'notification_listener_failed', code: 'NOTIFICATION_LISTENER_UNAVAILABLE' })
      wake()
      retry = setTimeout(() => { void connect() }, 3000); retry.unref()
    }
    connection.on('error', failed)
    connection.on('notification', message => { if (message.channel === 'rephouse_notificacoes') wake() })
    try { await connection.connect(); await connection.query('LISTEN rephouse_notificacoes'); wake() }
    catch { failed() }
  }
  void connect()
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    async close() { stopped = true; if (retry) clearTimeout(retry); listeners.clear(); await client?.end().catch(() => {}) },
  }
}
export type NotificationsSignal = Pick<ReturnType<typeof createNotificationsSignal>, 'subscribe'>

export function createNotificationsStreams(service: ReturnType<typeof createNotificationsService>, verify: (token: string) => Promise<Actor>, signal?: NotificationsSignal) {
  const responses = new Set<Response>()
  const handler: RequestHandler = async (req, res) => {
    const token = req.get('Authorization')?.slice(7) ?? ''
    const actor = await verify(token)
    const initial = await service.revision(actor)
    if (!initial) throw new AppError(409, 'NO_REPUBLIC', 'Entre em uma república para receber notificações.')
    res.status(200).set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' })
    res.flushHeaders()
    responses.add(res)
    let revision = initial.revision, closed = false, running = false, pending = false
    const send = (name: string) => { if (!closed && !res.writableEnded) { if (!res.write(`event: ${name}\ndata: {}\n\n`)) res.end() } }
    const check = async () => {
      if (closed) return
      if (running) { pending = true; return }
      running = true
      try {
        const snapshot = await service.revision(await verify(token))
        if (!snapshot || snapshot.republicaId !== initial.republicaId) { send('contexto-encerrado'); res.end(); return }
        if (snapshot.revision !== revision) { revision = snapshot.revision; send('atualizar') }
      } catch (error) {
        send(error instanceof AppError && error.statusCode === 401 ? 'sessao-encerrada' : 'indisponivel')
        res.end()
      } finally {
        running = false
        if (pending) { pending = false; void check() }
      }
    }
    const unsubscribe = signal?.subscribe(() => { void check() })
    const timer = setInterval(() => { void check(); if (!closed) res.write(': heartbeat\n\n') }, 15000)
    timer.unref()
    res.once('close', () => { closed = true; clearInterval(timer); unsubscribe?.(); responses.delete(res) })
    send('conectado')
    void check()
  }
  return { handler, close() { for (const response of responses) response.end(); responses.clear() } }
}
