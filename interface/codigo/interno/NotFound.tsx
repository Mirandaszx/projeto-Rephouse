import './workspace.css'
import './not-found.css'

export default function NotFound() {
  const signedIn = Boolean(sessionStorage.getItem('rephouse-token'))
  return <main className="republica rep-internal workspace-not-found">
    <section aria-labelledby="not-found-title">
      <h1 id="not-found-title">Página não encontrada.</h1>
      <p>Este endereço não existe. Confira o link ou escolha para onde voltar.</p>
      <div><a className="workspace-return" href={signedIn ? '/republica' : '/'}>{signedIn ? 'Voltar à república' : 'Voltar ao início'}</a>{signedIn && <a href="/">Página inicial</a>}</div>
    </section>
  </main>
}
