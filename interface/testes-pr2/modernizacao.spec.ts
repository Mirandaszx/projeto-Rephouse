import { test, expect } from '@playwright/test'
import { contrast } from './auxiliares/contraste'
import { prepare, shots, type Fixture } from './auxiliares/modernizacao-fixture'

// Instancia HTTP isolada por arquivo; os controles reais permanecem habilitados.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'modernizacao.spec.ts' } })

test('identidade interna mantém largura, contraste e navegação nos dois temas e seis tamanhos', async ({ page }) => {
  test.setTimeout(180000)
  const fixture: Fixture = {}
  await prepare(page, fixture)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    for (const width of [320, 390, 768, 1024, 1366, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/republica', '/republica/despesas', '/republica/tarefas', '/republica/moradores', '/republica/perfil', '/republica/financeiro', '/republica/configuracoes', '/admin']) {
        fixture.master = path === '/admin'
        await page.goto(path)
        const root = page.locator('.rep-internal')
        await expect(root).toBeVisible()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.getByText('Carregando administração…')).toHaveCount(0)
        if (path === '/republica') await expect(page.locator('.rep-pending-tasks li')).toHaveCount(1)
        if (path === '/republica/financeiro') await expect(page.getByRole('region', { name: 'Resumo do seu financeiro' })).toBeVisible()
        const layout = await root.evaluate(element => {
          const main = element.querySelector('main')!.getBoundingClientRect()
          return { width: main.width, display: getComputedStyle(element).display, overflow: document.documentElement.scrollWidth > innerWidth, offenders: Array.from(element.querySelectorAll('*')).filter(node => node.getBoundingClientRect().right > innerWidth + 1 && node.getBoundingClientRect().width > 0).slice(0, 8).map(node => ({ class: node.className, right: node.getBoundingClientRect().right })) }
        })
        expect(layout.overflow, `${path} ${theme} ${width}: ${JSON.stringify(layout.offenders)}`).toBe(false)
        const account = path.endsWith('/perfil') || path.endsWith('/financeiro')
        expect(layout.width).toBeGreaterThanOrEqual(account ? Math.min(width, 940) - 1 : width - (width < 720 ? 0 : width < 1024 ? 208 : 248) - 1)
        expect(await page.getByRole('heading', { level: 1 }).evaluate(element => getComputedStyle(element).fontSize)).toBe(width < 720 ? '28px' : '36px')
        if (width >= 720 && !account) {
          const rail = page.locator(path === '/admin' ? '.rh-admin-rail' : '.rep-sidebar')
          await expect(rail).toBeVisible()
          expect((await rail.boundingBox())!.width).toBe(width < 1024 ? 208 : 248)
          const active = rail.locator('[aria-current="page"]')
          await expect(active).toHaveCount(1)
          expect(await contrast(active)).toBeGreaterThanOrEqual(4.5)
        }
        for (const badge of await page.locator('.workspace-badge').all()) expect(await contrast(badge)).toBeGreaterThanOrEqual(4.5)
        if (path.endsWith('/perfil')) expect(await contrast(page.getByRole('button', { name: 'Excluir minha conta', exact: true }))).toBeGreaterThanOrEqual(4.5)
        if ((theme === 'light' && width === 1440) || (theme === 'dark' && width === 390)) await page.screenshot({ path: `${shots}/${path.split('/').pop() || 'republica'}-${theme}-${width}.png`, fullPage: true })
      }
    }
  }
  expect(errors).toEqual([])
})

test('conteúdo extremo, estados vazios, atraso, falha e recuperação continuam legíveis', async ({ page }) => {
  test.setTimeout(90000)
  const fixture: Fixture = { long: true }
  await prepare(page, fixture)
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/republica', '/republica/despesas', '/republica/tarefas', '/republica/moradores', '/republica/perfil', '/admin']) {
      fixture.master = path === '/admin'
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      if (path === '/republica/tarefas') await expect(page.getByText('Em atraso', { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Conteúdo extremo: ${path} ${width}`).toBe(true)
    }
  }
  fixture.master = false; fixture.long = false; fixture.empty = true
  await page.goto('/republica/despesas')
  await expect(page.getByText('Nenhuma despesa cadastrada na casa.')).toBeVisible()
  await page.goto('/republica/tarefas')
  await expect(page.getByText('Nenhuma tarefa cadastrada na casa.')).toBeVisible()
  fixture.empty = false; fixture.taskError = true
  await page.goto('/republica')
  await expect(page.getByRole('alert')).toHaveText('Não foi possível carregar as tarefas agora.')
  fixture.taskError = false
  await page.getByRole('button', { name: 'Tentar carregar tarefas', exact: true }).click()
  await expect(page.locator('.rep-pending-tasks li')).toHaveCount(1)
  let release!: () => void
  fixture.loading = new Promise<void>(resolve => { release = resolve })
  await page.goto('/republica')
  await expect(page.getByText('Carregando tarefas…', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Resumo da república' })).toContainText('80,00')
  release(); fixture.loading = undefined
  await expect(page.locator('.rep-pending-tasks li')).toHaveCount(1)
  fixture.taskError = true; fixture.longError = true
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/republica/tarefas')
  await expect(page.getByRole('alert')).toContainText('Tarefas indisponíveis para conferência.')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  fixture.taskError = false; fixture.longError = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.locator('.rep-task-row')).toHaveCount(2)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const lastAction = page.getByRole('button', { name: 'Editar tarefa Cuidar das plantas', exact: true })
  const lastBounds = (await lastAction.boundingBox())!
  const dockBounds = (await page.locator('.rep-glisse-dock').boundingBox())!
  expect(lastBounds.y + lastBounds.height).toBeLessThan(dockBounds.y)
  await page.goto('/republica/financeiro')
  await expect(page.getByText('República atual', { exact: true })).toBeVisible()
  await expect(page.getByText('Vínculo anterior', { exact: true })).toBeVisible()
  fixture.noHouse = true
  await page.goto('/republica')
  await expect(page.getByRole('radio', { name: 'Tenho um convite', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Criar república', exact: true }).click()
  await expect(page.getByLabel('Nome da república', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `${shots}/entrada-republica.png`, fullPage: true })
})

test('janela baixa, reflow equivalente a zoom de 200%, teclado e CSS interno preservam o acesso', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/login')
  await page.evaluate(() => document.fonts.ready)
  const login = await page.locator('.auth-page').screenshot()
  await page.goto('/republica')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#conteudo-interno')).toBeFocused()
  await page.goto('/login')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.locator('.auth-page').screenshot()).toEqual(login)
  // 1440×900 em 200% oferece 720×450 pixels CSS para reflow.
  for (const size of [{ width: 1366, height: 600 }, { width: 720, height: 450 }]) {
    await page.setViewportSize(size)
    await page.goto('/republica/despesas')
    await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Nova despesa', exact: true })
    await dialog.getByRole('button', { name: 'Adicionar', exact: true }).scrollIntoViewIfNeeded()
    await expect(dialog.getByRole('button', { name: 'Adicionar', exact: true })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  }
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/republica/perfil')
  await page.getByLabel('Nome', { exact: true }).focus()
  expect(await page.getByLabel('Nome', { exact: true }).evaluate(input => getComputedStyle(input).outlineStyle)).not.toBe('none')
})
