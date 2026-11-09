import { useState } from 'react'
import type { FormEvent } from 'react'
import { request } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import './republica.css'
import './motion.css'
import AnimatedTitle from '../rebuild/AnimatedTitle'
import { AnimatedField } from '../rebuild/Fields'

export default function Auth({ register }: { register: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    setError('')
    try {
      const { token } = await request<{ token: string }>(register ? '/auth/register' : '/auth/login', undefined, fields)
      sessionStorage.setItem('rephouse-token', token)
      window.location.assign('/novo')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Tente novamente.')
      setBusy(false)
    }
  }

  return <main className="republica rep-auth">
    <aside className="rep-auth-story">
      <a className="rep-brand" href="/novo">⌂ RepHouse</a>
      <div><p>Para quem divide a casa</p><h2>As contas da casa, em dia.</h2><p>Veja sua parte nas despesas e saiba o que ainda falta pagar.</p></div>
    </aside>
    <section className="rep-auth-panel">
      <form onSubmit={submit}>
        <AnimatedTitle>{register ? 'Crie sua conta' : 'Bem-vindo de volta'}</AnimatedTitle>
        {register && <AnimatedField label="Nome" name="nome" autoComplete="name" required maxLength={120} />}
        <AnimatedField label="E-mail" name="email" type="email" autoComplete="email" required />
        <AnimatedField label="Senha" name="senha" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} required />
        {error && <p role="alert">{error}</p>}
        <GlisseButton type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'} <span className={busy ? 'rep-spinner' : undefined} aria-hidden="true">{busy ? '' : '↗'}</span></GlisseButton>
        <a href={register ? '/novo/login' : '/novo/cadastro'}>{register ? 'Já tenho uma conta' : 'Criar uma conta'}</a>
      </form>
    </section>
  </main>
}
