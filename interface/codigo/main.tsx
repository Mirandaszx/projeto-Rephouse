import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { lazy, Suspense } from 'react'
import './index.css'
import './aparencia/appearance'
import './aparencia/appearance.css'
import { workspacePaths } from './interno/routes'
import { BootLoader } from './interno/BootLoader'

const App = lazy(() => import('./App'))
const DesignSystem = lazy(() => import('./DesignSystem'))
const Republica = lazy(() => import('./novo/Republica'))
const Auth = lazy(() => import('./novo/Auth'))
const Home = lazy(() => import('./rebuild/Home'))
const NotFound = lazy(() => import('./interno/NotFound'))
const Privacidade = lazy(() => import('./interno/Privacidade'))

const path = window.location.pathname.replace(/\/$/, '')
// Mantém os favoritos antigos, mas toda navegação nova usa os caminhos definitivos.
const previousRoutes: Record<string, string> = {
  '/novo': '/republica',
  '/novo/login': '/login',
  '/novo/cadastro': '/cadastro',
  '/novo/despesas': '/republica/despesas',
  '/novo/tarefas': '/republica/tarefas',
  '/novo/moradores': '/republica/moradores',
  '/novo/admin': '/admin',
}
const redirect = previousRoutes[path]
const screen = path === '/login' || path === '/cadastro' || path === '/confirmar-email'
  ? <Auth register={path.endsWith('/cadastro')} confirm={path === '/confirmar-email'} />
  : workspacePaths.has(path)
    ? <Republica />
    : path === '/design-system' ? <DesignSystem />
      : path === '/privacidade' ? <Privacidade />
      : path === '/legado' ? <App /> : path === '' ? <Home /> : <NotFound />

if (redirect) {
  window.location.replace(redirect + window.location.search + window.location.hash)
} else createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<BootLoader />}>{screen}</Suspense>
  </StrictMode>,
)
