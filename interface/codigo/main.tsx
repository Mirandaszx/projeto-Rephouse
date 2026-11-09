import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { lazy, Suspense } from 'react'
import './index.css'

const App = lazy(() => import('./App'))
const DesignSystem = lazy(() => import('./DesignSystem'))
const Republica = lazy(() => import('./novo/Republica'))
const Auth = lazy(() => import('./novo/Auth'))
const Home = lazy(() => import('./rebuild/Home'))

const path = window.location.pathname.replace(/\/$/, '')
const screen = path === '/novo/login' || path === '/novo/cadastro'
  ? <Auth register={path.endsWith('/cadastro')} />
  : path === '/novo' || path.startsWith('/novo/')
    ? <Republica />
    : path === '/design-system' ? <DesignSystem />
      : path === '/legado' ? <App /> : <Home />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<p role="status">Carregando RepHouse…</p>}>{screen}</Suspense>
  </StrictMode>,
)
