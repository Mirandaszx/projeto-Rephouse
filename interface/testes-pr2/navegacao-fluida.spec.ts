import { test, expect } from '@playwright/test'
import { prepare } from './auxiliares/modernizacao-fixture'

// Instancia HTTP isolada por arquivo; os controles reais permanecem habilitados.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'navegacao-fluida.spec.ts' } })

declare global {
  interface Window {
    routeMarker?: string
    routeRail?: Element | null
    routeFrames: { opacity: number; transform: string }[]
  }
}

async function observeFrames(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.routeFrames = []
    const observed = new WeakSet<Element>()
    new MutationObserver(() => {
      for (const element of document.querySelectorAll('.workspace-page')) {
        if (observed.has(element)) continue
        observed.add(element)
        const start = performance.now()
        const frame = () => {
          if (!element.isConnected) return
          const style = getComputedStyle(element)
          window.routeFrames.push({ opacity: Number(style.opacity), transform: style.transform })
          if (performance.now() - start < 300) requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }
    }).observe(document, { subtree: true, childList: true })
  })
}

test('troca de páginas mantém documento e lateral, revalida a sessão e produz quadros de animação', async ({ page }) => {
  await prepare(page)
  await observeFrames(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/republica')
  await expect(page.locator('.rep-pending-tasks li')).toHaveCount(1)
  await page.evaluate(() => { window.routeMarker = 'documento-preservado'; window.routeRail = document.querySelector('.rep-sidebar'); window.routeFrames = [] })
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let delay = true
  await page.route('**/api/me', async route => { if (delay) await gate; await route.fallback() })
  await page.getByRole('navigation', { name: 'Navegação da casa' }).getByRole('link', { name: 'Despesas', exact: true }).click()
  await expect(page).toHaveURL(/\/republica\/despesas$/)
  await expect(page.getByText('Carregando página…', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '＋ Nova despesa', exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => window.routeRail === document.querySelector('.rep-sidebar'))).toBe(true)
  release(); delay = false
  await expect(page.getByRole('heading', { level: 1, name: 'Despesas', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.routeFrames.some(frame => frame.opacity > 0 && frame.opacity < .99))).toBe(true)
  await expect.poll(() => page.locator('.workspace-page').evaluate(element => getComputedStyle(element).opacity)).toBe('1')
  expect(await page.evaluate(() => window.routeMarker)).toBe('documento-preservado')
  expect(await page.evaluate(() => window.routeFrames.some(frame => frame.transform !== 'none'))).toBe(true)
  await page.getByRole('navigation', { name: 'Navegação da casa' }).getByRole('link', { name: 'Tarefas', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Tarefas', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Despesas', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { level: 1, name: 'Tarefas', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click()
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Camila Almeida')
  await page.getByRole('link', { name: 'Meu financeiro', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Resumo do seu financeiro' })).toBeVisible()
  expect(await page.evaluate(() => window.routeMarker)).toBe('documento-preservado')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Meu financeiro', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.routeMarker)).toBeUndefined()
})

test('teclado e movimento reduzido dispensam a entrada; falha de sessão admite nova tentativa', async ({ page }) => {
  await prepare(page)
  await observeFrames(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/republica')
  await expect(page.locator('.rep-pending-tasks li')).toHaveCount(1)
  await page.evaluate(() => { window.routeFrames = [] })
  await page.getByRole('navigation', { name: 'Navegação da casa' }).getByRole('link', { name: 'Despesas', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Despesas', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.routeFrames.length)).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.routeFrames.every(frame => frame.opacity === 1))).toBe(true)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => { window.routeFrames = [] })
  await page.getByRole('navigation', { name: 'Navegação da casa' }).getByRole('link', { name: 'Tarefas', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Tarefas', exact: true })).toBeVisible()
  await expect(page.locator('#conteudo-interno')).toBeFocused()
  expect(await page.evaluate(() => window.routeFrames.every(frame => frame.opacity === 1))).toBe(true)
  let fail = true
  await page.route('**/api/me', async route => {
    if (fail) return route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Sessão temporariamente indisponível.' } } })
    return route.fallback()
  })
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Sessão temporariamente indisponível.')
  await expect(page.getByText('Carregando sua conta…', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Nome', { exact: true })).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Camila Almeida')
})

test('links especiais continuam nativos e uma sessão revogada interrompe a navegação interna', async ({ page }) => {
  await prepare(page)
  await page.goto('/republica')
  await expect(page.locator('.rep-pending-tasks li')).toHaveCount(1)
  const native = await page.evaluate(() => {
    const cases = [
      { href: '/republica/despesas', ctrlKey: true },
      { href: '/republica/despesas', metaKey: true },
      { href: '/republica/despesas', shiftKey: true },
      { href: '/republica/despesas', altKey: true },
      { href: '/republica/despesas', target: '_blank' },
      { href: '/republica/despesas', download: '' },
      { href: '/republica?acao=criar' }, { href: '#conteudo-interno' },
      { href: '/' }, { href: 'https://example.invalid/republica' },
    ]
    return cases.map(item => {
      const link = document.createElement('a')
      link.href = item.href
      if ('target' in item) link.target = item.target!
      if ('download' in item) link.setAttribute('download', item.download!)
      document.querySelector('.rep-internal')!.append(link)
      let intercepted = false
      // Registrado após o navegador interno; impede o efeito nativo somente neste teste.
      const inspect = (event: MouseEvent) => { intercepted = event.defaultPrevented; event.preventDefault() }
      document.addEventListener('click', inspect, { once: true })
      link.dispatchEvent(new MouseEvent('click', { ...item, bubbles: true, cancelable: true, button: 0 }))
      link.remove()
      return intercepted
    })
  })
  expect(native).toEqual(Array(10).fill(false))
  await expect(page).toHaveURL(/\/republica$/)
  await page.route('**/api/me', route => route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED', message: 'Sessão revogada.' } } }))
  await page.getByRole('navigation', { name: 'Navegação da casa' }).getByRole('link', { name: 'Despesas', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.', exact: true })).toBeVisible()
})
