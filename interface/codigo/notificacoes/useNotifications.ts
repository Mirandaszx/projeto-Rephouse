import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, endSession, request } from '../api'
import type { Schemas } from '../gestao/types'

const empty: Schemas['NotificacoesNaoLidas'] = { tarefas: 0, despesas: 0, total: 0 }
export function useNotifications(token: string, houseId?: string) {
  const [counts, setCounts] = useState<Schemas['NotificacoesNaoLidas']>(empty)
  const [status, setStatus] = useState<'conectando'|'conectado'|'reconectando'>('conectando')
  const [enabled, setEnabled] = useState(true)
  const [revision, setRevision] = useState(0)
  const [loadedHouse,setLoadedHouse] = useState<string>()
  const refreshRef = useRef<() => Promise<void>>(async () => {})
  const refresh = useCallback(() => refreshRef.current(), [])
  useEffect(() => {
    if (!houseId || !token) return
    const controller = new AbortController()
    let failures = 0, requestSequence = 0
    const reconcile = async () => {
      const sequence=++requestSequence
      const value = await request<Schemas['NotificacoesNaoLidas']>('/notificacoes/nao-lidas', token, undefined, undefined, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      if (!controller.signal.aborted&&sequence===requestSequence) {
        setLoadedHouse(houseId); setEnabled(true)
        setCounts(current=>current.total===value.total&&current.tarefas===value.tarefas&&current.despesas===value.despesas&&current.gerais===value.gerais?current:value)
      }
    }
    refreshRef.current = reconcile
    const run = async () => {
      while (!controller.signal.aborted) {
        const connection = new AbortController()
        const abort = () => connection.abort()
        controller.signal.addEventListener('abort', abort, { once: true })
        let watchdog: ReturnType<typeof setTimeout> | undefined
        try {
          await reconcile()
          const response = await fetch('/api/notificacoes/eventos', { headers: { Authorization: `Bearer ${token}` }, signal: connection.signal })
          if (!response.ok) throw new ApiError(response, await response.json().catch(() => null))
          if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('Fluxo indisponível')
          const reader = response.body.getReader(), decoder = new TextDecoder()
          let buffer = ''
          while (!connection.signal.aborted) {
            clearTimeout(watchdog); watchdog = setTimeout(() => connection.abort(), 45000)
            const part = await reader.read()
            if (part.done) throw new Error('Conexão encerrada')
            buffer += decoder.decode(part.value, { stream: true }).replaceAll('\r\n','\n')
            let boundary: number
            while ((boundary = buffer.indexOf('\n\n')) >= 0) {
              const frame = buffer.slice(0,boundary); buffer = buffer.slice(boundary+2)
              const event = frame.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim()
              if (event === 'sessao-encerrada') { controller.abort(); endSession(); return }
              if (event === 'contexto-encerrado') { controller.abort(); window.location.replace('/republica'); return }
              if (event === 'indisponivel') throw new Error('Servidor indisponível')
              if (event === 'conectado' || event === 'atualizar') {
                await reconcile(); failures = 0; setStatus('conectado'); setRevision(value=>value+1)
                if (event === 'atualizar') window.dispatchEvent(new Event('rephouse:notifications-updated'))
              }
            }
            if (buffer.length > 65536) throw new Error('Evento inválido')
          }
        } catch (error) {
          if (controller.signal.aborted) return
          // O principal pode permanecer na versão anterior até sua ativação autorizada.
          if (error instanceof ApiError && error.status === 404) { setLoadedHouse(houseId); setEnabled(false); return }
          if (error instanceof ApiError && error.status === 401) { endSession(); return }
          setLoadedHouse(houseId); setStatus('reconectando')
        } finally {
          clearTimeout(watchdog); connection.abort(); controller.signal.removeEventListener('abort', abort)
        }
        const delay = Math.min(30000, 1000 * 2 ** Math.min(failures++,5))
        await new Promise<void>(resolve => {
          const finish = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', finish); resolve() }
          const timer = setTimeout(finish,delay)
          controller.signal.addEventListener('abort',finish,{once:true})
          if (controller.signal.aborted) finish()
        })
      }
    }
    void run()
    const focused = () => { void reconcile().catch(() => {}) }
    window.addEventListener('focus',focused)
    return () => { controller.abort(); window.removeEventListener('focus',focused); refreshRef.current = async () => {} }
  }, [token,houseId])
  return { counts: loadedHouse===houseId?counts:empty, status: loadedHouse===houseId?status:'conectando' as const, enabled: loadedHouse===houseId?enabled:true, revision, refresh }
}
export type NotificationsState = ReturnType<typeof useNotifications>
