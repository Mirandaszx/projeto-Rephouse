import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { contrast } from './auxiliares/contraste'

test('aparência segue o sistema, respeita escolha manual e sincroniza entre páginas e abas', async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/login')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('combobox', { name: 'Aparência', exact: true })).toHaveValue('system')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('combobox', { name: 'Aparência', exact: true }).selectOption('dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.goto('/cadastro')
  await expect(page.getByRole('combobox', { name: 'Aparência', exact: true })).toHaveValue('dark')
  const second = await context.newPage()
  try {
    await second.goto('/login')
    await expect(second.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('combobox', { name: 'Aparência', exact: true }).selectOption('light')
    await expect(second.locator('html')).toHaveAttribute('data-theme', 'light')
  } finally { await second.close() }
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('combobox', { name: 'Aparência', exact: true }).selectOption('system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('preferência funciona com armazenamento bloqueado e foco continua visível em alto contraste', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Bloqueado', 'SecurityError') } }))
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/login')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const select = page.getByRole('combobox', { name: 'Aparência', exact: true })
  await select.selectOption('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ forcedColors: 'active' })
  await select.focus()
  await expect(select).toBeFocused()
  expect(await select.locator('..').evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none')
})

test('telas públicas ficam legíveis e responsivas no modo escuro', async ({ page }) => {
  test.setTimeout(90000)
  const captures = '../.devops-local/interface/imagens/aparencia'
  await mkdir(captures, { recursive: true })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/login', '/cadastro']) {
      await page.goto(path)
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (path !== '/') {
        const email = page.getByLabel('E-mail', { exact: true })
        await email.fill('teste@example.test')
        expect(await contrast(email)).toBeGreaterThanOrEqual(4.5)
        expect(await contrast(email, 'borderTopColor')).toBeGreaterThanOrEqual(3)
        await expect(page.getByRole('combobox', { name: 'Aparência', exact: true })).toBeInViewport()
      } else if (width <= 768) {
        await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
        await expect(page.getByRole('combobox', { name: 'Aparência', exact: true })).toBeVisible()
        await page.getByRole('button', { name: 'Fechar menu', exact: true }).click()
      }
      await page.screenshot({ path: `${captures}/${path === '/' ? 'home' : path.slice(1)}-escuro-${width}.png`, fullPage: true })
    }
  }
  expect(errors).toEqual([])
})
