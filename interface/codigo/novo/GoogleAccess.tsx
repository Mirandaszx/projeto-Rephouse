import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, request } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import { LabelInput } from '../rebuild/vendor/spell-label-input'
import type { components } from '../../../integracao/api'

type Sessao = components['schemas']['Sessao']
type Desafio = components['schemas']['DesafioGoogle']
type Prova = { credential: string; desafioId: string }
interface GoogleIdentity {
  accounts: { id: {
    initialize(config: { client_id: string; nonce: string; callback: (response: { credential?: string }) => void; ux_mode: 'popup'; context: 'signin' | 'signup'; itp_support: boolean }): void
    renderButton(parent: HTMLElement, options: Record<string, string | number>): void
  } }
}
declare global { interface Window { google?: GoogleIdentity } }

// Biblioteca oficial do Google (Google Identity Services), carregada uma vez e só quando o acesso Google está ligado.
let biblioteca: Promise<GoogleIdentity> | undefined
function carregarGoogle() {
  biblioteca ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = 'https://accounts.google.com/gsi/client'
    tag.async = true
    tag.onload = () => window.google ? resolve(window.google) : reject(new Error('Google indisponível'))
    tag.onerror = () => { biblioteca = undefined; tag.remove(); reject(new Error('Google indisponível')) }
    document.head.appendChild(tag)
  })
  return biblioteca
}

/**
 * Entrar ou criar conta com o Google (25/11/2026). A API emite um desafio de uso único; o Google devolve uma
 * credencial amarrada a ele, e a API confere assinatura, destinatário e e-mail verificado antes de abrir a sessão.
 * Se o e-mail já tem conta com senha, a pessoa confirma a senha uma vez para ligar o Google à conta.
 */
export default function GoogleAccess({ clientId, register, disabled = false, onSession, onFailure }: {
  clientId: string
  register: boolean
  disabled?: boolean
  onSession: (session: Sessao) => void
  onFailure: (failure: unknown) => void
}) {
  const slot = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'indisponivel'>('carregando')
  const [vinculo, setVinculo] = useState<Prova | null>(null)
  const [rodada, setRodada] = useState(0)
  const [busy, setBusy] = useState(false)
  const [erroVinculo, setErroVinculo] = useState<string | null>(null)
  const enviando = useRef(false)
  const avisos = useRef({ onSession, onFailure })
  useEffect(() => { avisos.current = { onSession, onFailure } })

  async function concluir(prova: Prova, senha?: string) {
    if (enviando.current) return
    enviando.current = true; setBusy(true)
    try {
      avisos.current.onSession(await request<Sessao>('/auth/google', undefined, senha ? { ...prova, senha } : prova))
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'GOOGLE_LINK_REQUIRED') { setErroVinculo(null); setVinculo(prova); return }
      // A API não diferencia senha errada de confirmação vencida (de propósito); a confirmação continua aberta.
      if (senha && failure instanceof ApiError && failure.status === 401) {
        setErroVinculo('Senha incorreta, ou a confirmação do Google venceu. Confira a senha; se continuar, toque em Cancelar e entre com o Google de novo.')
        return
      }
      setVinculo(null); setErroVinculo(null); setRodada(value => value + 1)
      avisos.current.onFailure(failure)
    } finally { enviando.current = false; setBusy(false) }
  }
  const concluirRef = useRef(concluir)
  useEffect(() => { concluirRef.current = concluir })

  useEffect(() => {
    if (vinculo) return
    let ativo = true
    const controller = new AbortController()
    Promise.all([carregarGoogle(), request<Desafio>('/auth/google/desafio', undefined, { finalidade: 'login' }, undefined, controller.signal)])
      .then(([google, desafio]) => {
        if (!ativo || !slot.current) return
        google.accounts.id.initialize({
          client_id: clientId, nonce: desafio.nonce, ux_mode: 'popup', context: register ? 'signup' : 'signin', itp_support: true,
          callback: response => { if (response.credential) void concluirRef.current({ credential: response.credential, desafioId: desafio.desafioId }) },
        })
        slot.current.replaceChildren()
        google.accounts.id.renderButton(slot.current, {
          type: 'standard', size: 'large', shape: 'pill', logo_alignment: 'center', locale: 'pt-BR',
          theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
          text: register ? 'signup_with' : 'signin_with',
          width: Math.max(200, Math.min(400, Math.round(slot.current.clientWidth || 320))),
        })
        setEstado('pronto')
      })
      .catch(() => { if (ativo && !controller.signal.aborted) setEstado('indisponivel') })
    return () => { ativo = false; controller.abort() }
  }, [clientId, register, rodada, vinculo])

  function ligar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (vinculo) void concluir(vinculo, String(new FormData(event.currentTarget).get('senha') ?? ''))
  }

  if (vinculo) return <form className="auth-google-link" onSubmit={ligar} aria-busy={busy}>
    <p role="status">Já existe uma conta RepHouse com este e-mail. Digite a senha dela uma vez para ligar o Google à conta.</p>
    <fieldset disabled={busy} className="auth-fields">
      <LabelInput labelPlacement="outside" containerClassName="auth-field" label="Senha da conta" name="senha" type="password" placeholder="Sua senha" autoComplete="current-password" maxLength={128} required autoFocus />
    </fieldset>
    {erroVinculo && <p className="auth-error" role="alert">{erroVinculo}</p>}
    <GlisseButton className="auth-submit" tint="#d2ec9c" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Aguarde…' : 'Ligar o Google e entrar'}</GlisseButton>
    <button type="button" className="auth-email-back" disabled={busy} onClick={() => { setVinculo(null); setErroVinculo(null); setRodada(value => value + 1) }}>Cancelar</button>
  </form>

  return <div className="auth-google" aria-busy={estado === 'carregando' || busy} data-disabled={disabled || busy || undefined}>
    <div ref={slot} className="auth-google-slot" hidden={estado === 'indisponivel'} />
    {estado === 'carregando' && <p className="auth-google-note" role="status">Carregando o acesso com Google…</p>}
    {estado === 'indisponivel' && <p className="auth-google-note" role="status">O acesso com Google não carregou agora. Recarregue a página para tentar de novo.</p>}
  </div>
}
