import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'

const password = 'Senha-interface-teste-2026'
const captures = '../.devops-local/interface/imagens/cadastro-republica'

test('cadastro pelo novo formulário cria a conta e mantém a sessão real', async ({ page, request }) => {
  const email = `casinha-${randomUUID()}@integracao.rephouse.test`
  await page.goto('/login')
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sinta-se em casa.', exact: true })).toBeVisible()
  await page.getByLabel('Nome', { exact: true }).fill('Moradora de teste')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  const response = page.waitForResponse(res => res.url().endsWith('/api/auth/register') && res.request().method() === 'POST')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  expect((await response).status()).toBe(201)
  await expect(page).toHaveURL(/\/republica\?acao=criar$/)
  await expect(page.getByLabel('Nome da república', { exact: true })).toBeVisible()
  const token = await page.evaluate(() => sessionStorage.getItem('rephouse-token'))
  expect(token).toBeTruthy()
  const account = await request.get('http://127.0.0.1:3405/api/me', { headers: { Authorization: `Bearer ${token}` } })
  expect(account.status()).toBe(200)
  expect(await account.json()).toMatchObject({ email, nome: 'Moradora de teste', membro: null })
})

test('login real inválido apresenta erro e permite tentar novamente', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill('ana@integracao.rephouse.test')
  await page.getByLabel('Senha', { exact: true }).fill('Senha-incorreta-2026')
  await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos.')
  await expect(page.getByRole('button', { name: 'Entrar na minha conta', exact: true })).toBeEnabled()
  await expect(page.getByLabel('Senha', { exact: true })).toBeEnabled()
})

test('envio em andamento desabilita campos e impede submissão duplicada', async ({ page }) => {
  let release = () => {}, count = 0
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/auth/login', async route => { count++; await gate; await route.continue() })
  try {
    await page.goto('/login')
    await page.getByLabel('E-mail', { exact: true }).fill('ana@integracao.rephouse.test')
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Aguarde…', exact: true })).toBeDisabled()
    await expect(page.getByLabel('E-mail', { exact: true })).toBeDisabled()
    await expect.poll(() => count).toBe(1)
    await page.locator('.auth-form').evaluate(form => (form as HTMLFormElement).requestSubmit())
    expect(count).toBe(1)
    release()
    await expect(page).toHaveURL(/\/republica\/?$/)
    expect(count).toBe(1)
  } finally { release() }
})

test('layout, casa, teclado e senha em tamanhos de celular e computador', async ({ page }) => {
  await mkdir(captures, { recursive: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const [width, height] of [[320, 740], [390, 844], [768, 900], [1366, 768], [1440, 900], [1440, 560]]) {
    await page.setViewportSize({ width, height })
    for (const register of [false, true]) {
      await page.goto(register ? '/cadastro' : '/login')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('.auth-story')).toBeVisible({ visible: width >= 900 })
      const layout = await page.evaluate(() => {
        const root = document.documentElement, house = document.querySelector('.auth-house')!.getBoundingClientRect(), panel = document.querySelector('.auth-story')!.getBoundingClientRect()
        return { horizontal: root.scrollWidth > innerWidth, vertical: root.scrollHeight > innerHeight + 1, ratio: panel.width / (innerWidth - 24), houseInside: house.top >= panel.top && house.bottom <= panel.bottom && house.left >= panel.left && house.right <= panel.right }
      })
      expect(layout.horizontal, `${width}×${height}`).toBe(false)
      const contrast = await page.locator('.auth-submit').evaluate(button => {
        const style = getComputedStyle(button)
        const luminance = (color: string) => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(value => {
          const channel = value / 255
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4
        }).reduce((total, value, index) => total + value * [.2126, .7152, .0722][index]!, 0)
        const text = luminance(style.color), background = luminance(style.backgroundColor)
        return (Math.max(text, background) + .05) / (Math.min(text, background) + .05)
      })
      expect(contrast).toBeGreaterThanOrEqual(4.5)
      if (width >= 900) {
        expect(layout.ratio).toBeCloseTo(.46, 2)
        expect(layout.houseInside).toBe(true)
        if (height >= 768) expect(layout.vertical, `${register ? 'cadastro' : 'login'} ${width}×${height}`).toBe(false)
      }
      const email = page.getByLabel('E-mail', { exact: true })
      await email.focus(); await expect(email).toBeFocused()
      await email.press('Tab'); await expect(page.getByLabel('Senha', { exact: true })).toBeFocused()
      await page.getByLabel('Senha', { exact: true }).fill(password)
      await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click()
      await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text')
      await page.getByRole('button', { name: 'Ocultar senha', exact: true }).click()
      await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'password')
      if (register) {
        const create = page.getByRole('radio', { name: 'Quero criar uma república', exact: true })
        const join = page.getByRole('radio', { name: 'Já tenho um código', exact: true })
        await expect(create).toBeChecked()
        await create.focus()
        await create.press('ArrowRight')
        await expect(join).toBeChecked()
        await expect(join).toBeFocused()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        await join.press('ArrowLeft')
        await expect(create).toBeChecked()
      }
      await page.screenshot({ path: `${captures}/${register ? 'cadastro' : 'login'}-${width}x${height}.png`, fullPage: true })
    }
  }
})

test('erro longo continua legível no celular e em janela baixa', async ({ page }) => {
  const message = 'Não foi possível acessar sua conta. '.repeat(15)
  await page.route('**/api/auth/login', route => route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message } } }))
  for (const [width, height] of [[320, 600], [1440, 560]]) {
    await page.setViewportSize({ width, height })
    await page.goto('/login')
    await page.getByLabel('E-mail', { exact: true }).fill('ana@integracao.rephouse.test')
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText(message.trim())
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Entrar na minha conta', exact: true })).toBeInViewport()
  }
})
