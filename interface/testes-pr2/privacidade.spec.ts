import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { confirmInBrowser } from './auxiliares/email-harness'

// LGPD (26/11/2026): política pública, avisos no cadastro e cópia dos próprios dados em Meu perfil.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'privacidade.spec.ts' } })

test('política de privacidade é pública, mostra o contato e cabe no celular', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/privacidade')
  await expect(page.getByRole('heading', { level: 1, name: 'Privacidade e termos de uso' })).toBeVisible()
  for (const name of ['Quais dados guardamos', 'Seus direitos e como exercê-los', 'Termos de uso']) await expect(page.getByRole('heading', { level: 2, name })).toBeVisible()
  await expect(page.getByRole('link', { name: 'privacidade@integracao.rephouse.test' }).first()).toHaveAttribute('href', /^mailto:privacidade@integracao\.rephouse\.test/)
  await page.getByRole('navigation', { name: 'Nesta página' }).getByRole('link', { name: 'Seus direitos' }).click()
  await expect(page).toHaveURL(/#direitos$/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('cadastro avisa os termos e o login leva à política', async ({ page }) => {
  await page.goto('/cadastro')
  await expect(page.getByText('Ao criar a conta, você aceita os', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: 'política de privacidade', exact: true })).toHaveAttribute('href', '/privacidade')
  await page.goto('/login')
  await expect(page.getByText('Ao criar a conta', { exact: false })).toHaveCount(0)
  await page.getByRole('link', { name: 'Privacidade e termos', exact: true }).click()
  await expect(page).toHaveURL(/\/privacidade$/)
})

test('meu perfil baixa uma cópia dos próprios dados, sem segredos', async ({ page }) => {
  const email = `privacidade-${randomUUID()}@integracao.rephouse.test`
  await page.goto('/cadastro')
  await page.getByLabel('Nome', { exact: true }).fill('Pessoa Privada')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('Senha-interface-teste-2026')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await confirmInBrowser(page, email)
  await page.goto('/republica/perfil')
  await expect(page.getByRole('heading', { name: 'Privacidade e seus dados' })).toBeVisible()
  await expect(page.getByText('seu nome vira "Ex-morador"', { exact: false })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar meus dados', exact: true }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('rephouse-meus-dados.json')
  const text = await readFile((await file.path())!, 'utf8')
  const dados = JSON.parse(text)
  expect(dados.conta).toMatchObject({ nome: 'Pessoa Privada', email })
  expect(text).not.toMatch(/argon2|senhaHash|tokenHash|cookieHash|hashSha256/i)
})
