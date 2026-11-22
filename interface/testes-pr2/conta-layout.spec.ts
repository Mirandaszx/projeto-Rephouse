import { test, expect } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'

// Instancia HTTP isolada por arquivo; os controles reais permanecem habilitados.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'conta-layout.spec.ts' } })

test('perfil e financeiro usam a largura central mesmo com o CSS base carregado por último', async ({ page }) => {
  test.setTimeout(90000)
  const accounts = JSON.parse(await readFile('../.devops-local/interface/gestao-contas.json', 'utf8')) as Record<string, { token: string }>
  const captures = '../.devops-local/interface/imagens/conta-layout'
  await mkdir(captures, { recursive: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/login')
  await page.evaluate(token => sessionStorage.setItem('rephouse-token', token), accounts.removido.token)
  for (const theme of ['dark', 'light']) {
    for (const width of [1440, 1740, 1366, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/republica/perfil', '/republica/financeiro']) {
        await page.goto(path)
        await expect(page.locator('.rep-account-shell')).toBeVisible()
        await page.getByRole('switch', { name: 'Modo escuro', exact: true }).press(theme === 'dark' ? 'ArrowRight' : 'ArrowLeft')
        if (path.endsWith('/financeiro')) await expect(page.getByText('Nenhuma despesa no seu histórico.', { exact: true })).toBeVisible()
        // Reproduz a ordem de estilos observada no servidor, independentemente do HMR.
        await page.evaluate(() => {
          const base = document.querySelector('style[data-vite-dev-id$="/novo/republica.css"]')
          if (!base) throw new Error('CSS base da república não encontrado')
          document.head.append(base)
        })
        const layout = await page.locator('.rep-account-shell').evaluate(shell => {
          const main = shell.querySelector('main')!.getBoundingClientRect()
          return { display: getComputedStyle(shell).display, width: main.width, left: main.left, viewport: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }
        })
        expect(layout.display, `${path}: CSS carregado por último em ${width}`).toBe('block')
        expect(layout.width).toBeCloseTo(Math.min(width, 940), 0)
        expect(layout.left).toBeCloseTo((width - layout.width) / 2, 0)
        expect(layout.overflow).toBe(false)
        await expect(page.getByRole('navigation', { name: 'Sua conta', exact: true })).toBeVisible()
        await page.screenshot({ path: `${captures}/${path.split('/').pop()}-${theme}-${width}.png`, fullPage: true })
      }
    }
  }
})
