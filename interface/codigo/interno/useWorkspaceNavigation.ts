import { useEffect, useState } from 'react'

const paths = new Set(['/republica', '/republica/despesas', '/republica/tarefas', '/republica/moradores', '/republica/perfil', '/republica/financeiro', '/republica/configuracoes', '/admin'])
const pathname = () => window.location.pathname.replace(/\/$/, '')

/** Navegação somente dentro da área existente; links públicos e modificados continuam nativos. */
export function useWorkspaceNavigation() {
  const [route, setRoute] = useState(() => ({ path: pathname(), animate: false, focus: false }))
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('.rep-internal a[href]') : null
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self') || document.querySelector('dialog[open]')) return
      const url = new URL(link.href)
      const path = url.pathname.replace(/\/$/, '')
      if (url.origin !== window.location.origin || !paths.has(path) || url.search || url.hash) return
      event.preventDefault()
      if (path === pathname()) return
      window.history.pushState(null, '', url.pathname)
      setRoute({ path, animate: event.detail > 0, focus: event.detail === 0 })
    }
    const pop = () => { setRoute({ path: pathname(), animate: false, focus: true }) }
    document.addEventListener('click', click)
    window.addEventListener('popstate', pop)
    return () => {
      document.removeEventListener('click', click)
      window.removeEventListener('popstate', pop)
    }
  }, [])
  return route
}
