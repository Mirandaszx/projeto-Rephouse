import { test, expect, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { contrast } from './auxiliares/contraste'

const requestId = 'f1a054f4-9b6a-4dec-bb3a-24c3f06a211a'
const shots = fileURLToPath(new URL('../../.devops-local/interface/imagens/auth-feedback', import.meta.url))

async function submit(page: Page) {
  await page.getByLabel('E-mail', { exact: true }).fill('conta@integracao.rephouse.test')
  await page.getByLabel('Senha', { exact: true }).fill('Senha-incorreta-2026')
  await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.mouse.move(0, 0)
}

test('erro de acesso tem orientação clara e código recolhido que pode ser copiado', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (value: string) => { Object.assign(window, { copiedSupport: value }) },
    } })
  })
  await page.route('**/api/auth/login', route => route.fulfill({ status: 401, headers: { 'X-Request-Id': requestId },
    json: { error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' } } }))
  await page.goto('/login')
  await submit(page)
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos. Confira os dados e tente novamente.')
  await expect(page.getByRole('alert')).not.toContainText(requestId)
  await expect(page.locator('.auth-error-support code')).not.toBeVisible()
  await page.clock.install()
  await page.getByText('Detalhes para suporte', { exact: true }).click()
  await expect(page.locator('.auth-error-support code')).toHaveText(requestId)
  await page.getByRole('button', { name: 'Copiar código', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Código copiado.')
  expect(await page.evaluate(() => (window as unknown as { copiedSupport: string }).copiedSupport)).toBe(requestId)
  await page.mouse.move(0, 0)
  await page.getByLabel('Senha', { exact: true }).focus()
  await page.clock.runFor(20_000)
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar mensagem', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('aviso desaparece em oito segundos, reinicia em nova tentativa e pausa com hover ou foco', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/auth/login', route => route.fulfill({ status: 401,
    json: { error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' } } }))
  await page.goto('/login')
  await page.clock.install()
  await submit(page)
  await page.clock.runFor(7900)
  await expect(page.getByRole('alert')).toBeVisible()
  await page.clock.runFor(200)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('conta@integracao.rephouse.test')
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('Senha-incorreta-2026')
  await submit(page)
  await page.clock.runFor(7000)
  await submit(page)
  await page.clock.runFor(2000)
  await expect(page.getByRole('alert')).toBeVisible()
  await page.clock.runFor(6100)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await submit(page)
  await page.getByRole('alert').hover()
  await page.clock.runFor(20_000)
  await expect(page.getByRole('alert')).toBeVisible()
  await page.mouse.move(0, 0)
  await page.getByRole('button', { name: 'Fechar mensagem', exact: true }).focus()
  await page.clock.runFor(20_000)
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByLabel('Senha', { exact: true }).focus()
  await page.clock.runFor(8100)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('falhas e detalhes cabem nos dois temas, preservando Retry-After e mensagens do servidor', async ({ page }) => {
  await mkdir(shots, { recursive: true })
  let status = 429
  await page.route('**/api/auth/login', route => route.fulfill({ status, headers: { 'X-Request-Id': requestId, 'Retry-After': '60' },
    json: { error: { code: status === 429 ? 'RATE_LIMITED' : 'UNAVAILABLE', message: status === 429 ? 'Muitas tentativas.' : 'Não foi possível acessar sua conta agora.' } } }))
  for (const width of [320, 390, 1440]) for (const colorScheme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width, height: 740 })
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/login')
    await submit(page)
    await expect(page.getByRole('alert')).toContainText(status === 429 ? 'Tente novamente após 60 segundos.' : 'Não foi possível acessar sua conta agora.')
    expect(await contrast(page.getByRole('alert'))).toBeGreaterThanOrEqual(4.5)
    await page.getByText('Detalhes para suporte', { exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('.auth-error-support code')).toBeVisible()
    await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Entrar na minha conta', exact: true })).toBeInViewport()
    await page.screenshot({ path: `${shots}/erro-${colorScheme}-${width}.png`, fullPage: true })
    status = status === 429 ? 503 : 429
  }
})
