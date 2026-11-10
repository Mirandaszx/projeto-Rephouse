import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import { motion, useReducedMotion } from 'motion/react'
import { House, LoaderCircle } from 'lucide-react'
import { LabelInput } from '../rebuild/vendor/spell-label-input'
import AuthHouse from './AuthHouse'
import AppearanceControl from '../aparencia/AppearanceControl'
import './auth.css'

function AuthBrand({ mobile = false }: { mobile?: boolean }) {
  return <a className={`auth-brand${mobile ? ' auth-brand-mobile' : ''}`} href="/" aria-label="RepHouse, página inicial">
    <span className="auth-brand-icon"><House size={24} strokeWidth={1.7} aria-hidden="true" /></span>
    <span>RepHouse<span className="auth-brand-dot">.</span></span>
  </a>
}

export default function Auth({ register }: { register: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [houseAction, setHouseAction] = useState<'criar' | 'entrar'>('criar')
  const submitting = useRef(false)
  const reduced = useReducedMotion()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const fields = new FormData(event.currentTarget)
    // A escolha da casa orienta a próxima tela; não faz parte do contrato de cadastro.
    const input = { email: fields.get('email'), senha: fields.get('senha'), ...(register ? { nome: fields.get('nome') } : {}) }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const { token } = await request<{ token: string }>(register ? '/auth/register' : '/auth/login', undefined, input)
      sessionStorage.setItem('rephouse-token', token)
      window.location.assign(register ? `/republica?acao=${houseAction}` : '/republica')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Tente novamente.')
      submitting.current = false
      setBusy(false)
    }
  }

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
          <h1 id="auth-title">{register ? 'Sinta-se em casa.' : 'Bem-vindo de volta.'}</h1>
          <p>{register ? 'Já faz parte?' : 'Ainda não faz parte?'}{' '}<a href={register ? '/login' : '/cadastro'}>{register ? 'Entrar' : 'Criar conta'}</a></p>
        </header>
        <form className="auth-form" onSubmit={submit} aria-busy={busy}>
          <fieldset disabled={busy} className="auth-fields">
            {register && <LabelInput labelPlacement="outside" containerClassName="auth-field" label="Nome" name="nome" placeholder="Como você se chama?" autoComplete="name" required maxLength={120} />}
            <LabelInput labelPlacement="outside" containerClassName="auth-field" label="E-mail" name="email" type="email" placeholder="voce@exemplo.com" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} />
            <LabelInput labelPlacement="outside" containerClassName="auth-field" label="Senha" name="senha" type="password" placeholder={register ? 'Pelo menos 8 caracteres' : 'Sua senha'} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} maxLength={128} required />
          </fieldset>
          {register && <fieldset className="auth-house-choice" disabled={busy} aria-describedby="auth-house-help">
            <legend>Sua república</legend>
            <div className="auth-house-options">
              <label><input type="radio" name="republica" value="criar" checked={houseAction === 'criar'} onChange={() => setHouseAction('criar')} /><span>Quero criar uma república</span></label>
              <label><input type="radio" name="republica" value="entrar" checked={houseAction === 'entrar'} onChange={() => setHouseAction('entrar')} /><span>Já tenho um código</span></label>
            </div>
            <p id="auth-house-help">{houseAction === 'criar' ? 'Depois do cadastro, dê um nome à sua república e receba um código para convidar moradores.' : 'Depois do cadastro, informe o código compartilhado por alguém da sua república.'}</p>
          </fieldset>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <GlisseButton className="auth-submit" tint="#d2ec9c" type="submit" disabled={busy} aria-busy={busy}>
            {busy && <LoaderCircle className="auth-spinner" size={18} aria-hidden="true" />}
            {busy ? 'Aguarde…' : register ? 'Criar minha conta' : 'Entrar na minha conta'}
          </GlisseButton>
        </form>
        <p className="auth-reassurance"><span aria-hidden="true" />Uma casa organizada começa com você.</p>
      </motion.div>
      <p className="auth-panel-footer">RepHouse · Feito para compartilhar a casa, não a complicação.</p>
    </section>
  </main>
}
