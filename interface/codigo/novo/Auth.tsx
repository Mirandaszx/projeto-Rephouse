import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, request } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import { motion, useReducedMotion } from 'motion/react'
import { House, LoaderCircle } from 'lucide-react'
import { LabelInput } from '../rebuild/vendor/spell-label-input'
import AuthHouse from './AuthHouse'
import AppearanceControl from '../aparencia/AppearanceControl'
import AuthFeedback, { type AuthFailure } from './AuthFeedback'
import GoogleAccess from './GoogleAccess'
import './auth.css'
import type { components } from '../../../integracao/api'

type EmailPending = components['schemas']['EmailPendente']
type PendingRequest = {
  email: string
  finalidade: 'cadastro' | 'login'
  solicitacaoId: string
  expiraEm: number
}

function pendingRequest(email: string, finalidade: PendingRequest['finalidade'], result: EmailPending): PendingRequest {
  return { email, finalidade, solicitacaoId: result.solicitacaoId, expiraEm: Date.now() + 600_000 }
}

function enter(result: components['schemas']['Sessao'] & { acaoRepublica?: 'criar' | 'entrar' | null }) {
  sessionStorage.setItem('rephouse-token', result.token)
  window.location.assign(result.acaoRepublica ? `/republica?acao=${result.acaoRepublica}` : '/republica')
}

function AuthBrand({ mobile = false }: { mobile?: boolean }) {
  return <a className={`auth-brand${mobile ? ' auth-brand-mobile' : ''}`} href="/" aria-label="RepHouse, página inicial">
    <span className="auth-brand-icon"><House size={24} strokeWidth={1.7} aria-hidden="true" /></span>
    <span>RepHouse<span className="auth-brand-dot">.</span></span>
  </a>
}

export default function Auth({ register, confirm = false }: { register: boolean; confirm?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthFailure | null>(null)
  const dismissError = useCallback(() => setError(null), [])
  const [houseAction, setHouseAction] = useState<'criar' | 'entrar'>('criar')
  const submitting = useRef(false)
  const reduced = useReducedMotion()
  const [magic, setMagic] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null)
  const [googleClientId, setGoogleClientId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingRequest | null>(null)
  const [expiredRequest, setExpiredRequest] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  // Link de "entrar por e-mail" para quem ainda não tem conta: a confirmação pede nome e senha antes de criá-la.
  const [newAccount, setNewAccount] = useState(false)
  const [approval, setApproval] = useState<'codigo' | 'aprovado' | null>(null)
  const [proof] = useState(() => {
    if (!confirm) return null
    const params = new URLSearchParams(window.location.hash.slice(1))
    const id = params.get('id'), token = params.get('token')
    return id && token && /^[A-Za-z0-9_-]{43}$/.test(token) && /^[a-f0-9-]{36}$/i.test(id) ? { id, token } : null
  })
  const feedbackHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (confirm) window.history.replaceState(null, '', '/confirmar-email')
    const controller = new AbortController()
    void request<components['schemas']['MetodosAutenticacao']>('/auth/metodos', undefined, undefined, undefined, controller.signal)
      .then(methods => {
        setEmailEnabled(methods.email?.habilitado === true)
        setGoogleClientId(methods.google?.habilitado && methods.google.clientId ? methods.google.clientId : null)
      })
      .catch(() => { if (!controller.signal.aborted) setEmailEnabled(false) })
    return () => controller.abort()
  }, [confirm])
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])
  useEffect(() => { if (approval === 'aprovado') feedbackHeading.current?.focus() }, [approval])

  const showFailure = useCallback((failure: unknown) => {
    const message = failure instanceof ApiError ? failure.userMessage : 'Não foi possível conectar. Verifique sua conexão e tente novamente.'
    setError({ id: crypto.randomUUID(), message: failure instanceof ApiError && failure.code === 'INVALID_CREDENTIALS'
      ? message + ' Confira os dados e tente novamente.' : message, requestId: failure instanceof ApiError ? failure.requestId : undefined })
  }, [])
  useEffect(() => {
    if (!pending) return
    const { solicitacaoId: id, expiraEm } = pending
    const timer = window.setTimeout(() => setExpiredRequest(id), Math.max(0, expiraEm - Date.now()))
    return () => window.clearTimeout(timer)
  }, [pending])
  const expired = !!pending && expiredRequest === pending.solicitacaoId
  // Sem envio de e-mail, o cadastro acontece só pelo Google: some o formulário de e-mail e senha.
  const googleOnly = register && emailEnabled === false && !!googleClientId
  async function resend() {
    if (!pending || submitting.current || cooldown > 0) return
    submitting.current = true; setBusy(true); setResending(true); setError(null)
    try {
      const { email, finalidade } = pending
      const result = await request<EmailPending>('/auth/email/solicitar', undefined, { email, finalidade, codigoPorEmail: true })
      setPending(pendingRequest(email, finalidade, result))
      setNewAccount(false)
      setCooldown(60)
    } catch (failure) { showFailure(failure) }
    finally { submitting.current = false; setBusy(false); setResending(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || expired) return
    if (register && emailEnabled !== true) return
    if (confirm && !proof) return
    const fields = new FormData(event.currentTarget)
    // A escolha da casa orienta a próxima tela; não faz parte do contrato de cadastro.
    const input = { email: fields.get('email'), senha: fields.get('senha'), ...(register ? { nome: fields.get('nome') } : {}) }
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      if (pending) {
        const details = newAccount ? { nome: fields.get('nome'), senha: fields.get('senha') } : { codigo: fields.get('codigo') }
        try {
          const result = await request<components['schemas']['ResultadoConclusaoEmail']>('/auth/email/concluir', undefined,
            { id: pending.solicitacaoId, ...details })
          if ('token' in result) enter(result)
          else setExpiredRequest(pending.solicitacaoId)
        } catch (failure) {
          if (!newAccount && failure instanceof ApiError && failure.code === 'EMAIL_ACCOUNT_DETAILS_REQUIRED') { setNewAccount(true); return }
          throw failure
        }
      } else if (confirm) {
        try {
          const details = newAccount ? { nome: fields.get('nome'), senha: fields.get('senha') }
            : approval === 'codigo' ? { codigoAprovacao: fields.get('codigoAprovacao') } : {}
          const result = await request<components['schemas']['ResultadoConfirmacaoEmail']>('/auth/email/confirmar', undefined, { ...proof!, ...details })
          if ('token' in result) enter(result)
          else setApproval('aprovado')
        } catch (failure) {
          if (!newAccount && failure instanceof ApiError && failure.code === 'EMAIL_ACCOUNT_DETAILS_REQUIRED') { setNewAccount(true); return }
          if (failure instanceof ApiError && failure.code === 'EMAIL_APPROVAL_REQUIRED') { setApproval('codigo'); return }
          throw failure
        }
      } else if (register || magic) {
        const result = await request<EmailPending>(register ? '/auth/register' : '/auth/email/solicitar', undefined,
          register ? { ...input, acaoRepublica: houseAction, codigoPorEmail: true } : { email: input.email, finalidade: 'login', codigoPorEmail: true })
        setPending(pendingRequest(String(input.email), register ? 'cadastro' : 'login', result)); setCooldown(60)
      } else enter(await request<components['schemas']['Sessao']>('/auth/login', undefined, input))
    } catch (failure) {
      showFailure(failure)
    } finally { submitting.current = false; setBusy(false) }
  }

  const title = approval === 'aprovado' ? 'Pedido aprovado.' : approval === 'codigo' ? 'Confirme o outro aparelho.'
    : newAccount ? 'Crie sua conta.' : pending ? 'Digite o código.' : confirm ? 'Confirme seu acesso.'
      : magic ? 'Entre pelo seu e-mail.' : register ? 'Sinta-se em casa.' : 'Bem-vindo de volta.'
  const action = newAccount ? 'Criar conta e entrar' : approval === 'codigo' ? 'Aprovar pedido'
    : pending ? 'Confirmar código' : confirm ? 'Confirmar e entrar' : magic ? 'Enviar código' : register ? 'Criar minha conta' : 'Entrar na minha conta'

  return <main className="auth-page" data-mode={register ? 'register' : 'login'}>
    <aside className="auth-story" aria-label="Bem-vindo ao RepHouse">
      <AuthBrand />
      <div className="auth-story-copy">
        <p className="auth-eyebrow">Sua casa. Nosso ponto de encontro.</p>
        <h2><span>Dividir a casa.</span><span>Compartilhar</span><span>uma boa</span><span>rotina.</span></h2>
        <p className="auth-support">Mais organização para as tarefas.<br />Mais tempo para viver a república.</p>
      </div>
      <AuthHouse />
      <p className="auth-story-footer"><span><House size={15} strokeWidth={1.5} aria-hidden="true" /></span>Um lugar para organizar a vida em comum.</p>
    </aside>
    <section className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-appearance"><AppearanceControl compact /></div>
      <AuthBrand mobile />
      <motion.div className="auth-content" initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.18, ease: 'easeOut' }}>
        <header className="auth-heading">
          <h1 id="auth-title" ref={feedbackHeading} tabIndex={-1}>{title}</h1>
          {!pending && !confirm && <p>{register ? 'Já faz parte?' : 'Ainda não faz parte?'}{' '}<a href={register ? '/login' : '/cadastro'}>{register ? 'Entrar' : 'Criar conta'}</a></p>}
        </header>
        {approval === 'aprovado' ? <div className="auth-email-note" role="status">
          <p>Volte para a tela onde você iniciou o pedido. O RepHouse vai continuar por lá.</p>
        </div> : <>
        <form className="auth-form" onSubmit={submit} aria-busy={busy}>
          {newAccount ? <>
            <p className="auth-email-note" role="status">Ainda não existe uma conta com este e-mail. Diga como você se chama e crie uma senha para terminar.</p>
            <fieldset disabled={busy} className="auth-fields">
              <LabelInput labelPlacement="outside" containerClassName="auth-field" label="Nome" name="nome" placeholder="Como você se chama?" autoComplete="name" required maxLength={120} autoFocus />
              <LabelInput labelPlacement="outside" containerClassName="auth-field" label="Senha" name="senha" type="password" placeholder="Pelo menos 8 caracteres" autoComplete="new-password" minLength={8} maxLength={128} required />
            </fieldset>
          </> : pending ? <>
            <p className="auth-email-note auth-code-help">Veja o código de 6 dígitos enviado para <strong>{pending.email}</strong>. Ele vale por 10 minutos.</p>
            <fieldset disabled={busy || expired} className="auth-fields">
              <LabelInput key={pending.solicitacaoId} labelPlacement="outside" containerClassName="auth-field auth-code-field"
                label="Código do e-mail" name="codigo" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                autoComplete="one-time-code" autoFocus required />
            </fieldset>
          </> : approval === 'codigo' ? <>
            <p className="auth-email-note">Digite o código que aparece no aparelho em que você pediu o link. Aprove apenas se você fez esse pedido.</p>
            <fieldset disabled={busy} className="auth-fields">
              <LabelInput labelPlacement="outside" containerClassName="auth-field" label="Código de aprovação" name="codigoAprovacao" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="off" required />
            </fieldset>
          </> : confirm ? <div className="auth-email-note">
            <p>{proof ? 'Confirme o pedido de acesso para continuar.' : 'O link está incompleto ou já foi removido desta página. Solicite outro para continuar.'}</p>
            <p>O link vale por 10 minutos e pode ser usado uma única vez.</p>
          </div> : <>
          {!googleOnly && <fieldset disabled={busy} className="auth-fields">
            {register && <LabelInput labelPlacement="outside" containerClassName="auth-field" label="Nome" name="nome" placeholder="Como você se chama?" autoComplete="name" required maxLength={120} />}
            <LabelInput labelPlacement="outside" containerClassName="auth-field" label="E-mail" name="email" type="email" placeholder="voce@exemplo.com" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} />
            {!magic && <LabelInput labelPlacement="outside" containerClassName="auth-field" label="Senha" name="senha" type="password" placeholder={register ? 'Pelo menos 8 caracteres' : 'Sua senha'} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} maxLength={128} required />}
          </fieldset>}
          {register && <fieldset className="auth-house-choice" disabled={busy} aria-describedby="auth-house-help">
            <legend>Sua república</legend>
            <div className="auth-house-options">
              <label><input type="radio" name="republica" value="criar" checked={houseAction === 'criar'} onChange={() => setHouseAction('criar')} /><span>Quero criar uma república</span></label>
              <label><input type="radio" name="republica" value="entrar" checked={houseAction === 'entrar'} onChange={() => setHouseAction('entrar')} /><span>Já tenho um código</span></label>
            </div>
            <p id="auth-house-help">{houseAction === 'criar' ? 'Depois do cadastro, dê um nome à sua república e receba um código para convidar moradores.' : 'Depois do cadastro, informe o código compartilhado por alguém da sua república.'}</p>
          </fieldset>}
          </>}
          {expired && <p className="auth-email-note" role="status">O código expirou ou foi substituído. Peça um novo código.</p>}
          {error && <AuthFeedback key={error.id} failure={error} onDismiss={dismissError} />}
          {register && emailEnabled === false && !googleClientId && <p className="auth-email-note" role="status">O cadastro está temporariamente indisponível. Contas existentes podem entrar com senha.</p>}
          {register && emailEnabled === null && <p className="auth-email-note" role="status">Verificando disponibilidade do cadastro…</p>}
          {googleOnly && <p className="auth-email-note auth-google-intro">Crie sua conta com o Google: leva poucos segundos e você não precisa inventar outra senha.</p>}
          {!googleOnly && <GlisseButton className="auth-submit" tint="#d2ec9c" type="submit" disabled={busy || expired || (confirm && !proof) || (register && emailEnabled !== true)} aria-busy={busy}>
            {busy && <LoaderCircle className="auth-spinner" size={18} aria-hidden="true" />}
            {busy ? 'Aguarde…' : action}
          </GlisseButton>}
        </form>
        {!pending && !confirm && !newAccount && !magic && googleClientId && <>
          {!googleOnly && <p className="auth-divider"><span>ou</span></p>}
          <GoogleAccess clientId={googleClientId} register={register} disabled={busy}
            onSession={session => enter(register ? { ...session, acaoRepublica: houseAction } : session)} onFailure={showFailure} />
        </>}
        {pending ? <div className="auth-code-actions">
          <button type="button" className="auth-email-back" disabled={busy || cooldown > 0} onClick={() => void resend()}>
            {resending ? 'Enviando…' : cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
          </button>
          <a className="auth-email-back" href={pending.finalidade === 'cadastro' ? '/cadastro' : '/login'}>Usar outro e-mail</a>
        </div> : confirm || newAccount ? <a className="auth-email-back" href="/login">Voltar ao login</a>
          : !register && emailEnabled && <button type="button" className="auth-email-back" disabled={busy} onClick={() => { setMagic(value => !value); setError(null) }}>{magic ? 'Usar minha senha' : 'Entrar com código por e-mail'}</button>}
        </>}
        {/* No cadastro, o aviso dos termos ocupa o lugar da frase decorativa, sem aumentar a tela (LGPD, 26/11/2026). */}
        {register || newAccount
          ? <p className="auth-reassurance auth-legal">Ao criar a conta, você aceita os <a href="/privacidade#termos">termos</a> e a <a href="/privacidade">política de privacidade</a>.</p>
          : <p className="auth-reassurance"><span aria-hidden="true" />Uma casa organizada começa com você.</p>}
      </motion.div>
      <p className="auth-panel-footer">RepHouse · Feito para compartilhar a casa, não a complicação.{!register && !newAccount && <> <a href="/privacidade">Privacidade e termos</a></>}</p>
    </section>
  </main>
}
