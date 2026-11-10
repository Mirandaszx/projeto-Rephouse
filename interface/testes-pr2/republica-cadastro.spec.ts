import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import type { components } from '../../integracao/api.js'

type Schemas = components['schemas']
const api = 'http://127.0.0.1:3405/api'
const password = 'Senha-interface-teste-2026'

async function signup(page: Page, action: 'criar' | 'entrar') {
  const email = `cadastro-casa-${randomUUID()}@integracao.rephouse.test`
  await page.goto('/cadastro')
  await page.getByLabel('Nome', { exact: true }).fill('Moradora da casa')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('radio', { name: action === 'criar' ? 'Quero criar uma república' : 'Já tenho um código', exact: true }).check()
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/republica\\?acao=${action}$`))
  return email
}

async function account(page: Page, request: APIRequestContext) {
  const token = await page.evaluate(() => sessionStorage.getItem('rephouse-token'))
  expect(token).toBeTruthy()
  const headers = { Authorization: `Bearer ${token}` }
  const result = await request.get(api + '/me', { headers })
  expect(result.status()).toBe(200)
  return { me: await result.json() as Schemas['MinhaConta'], headers }
}

async function invite(request: APIRequestContext) {
  const signup = await request.post(api + '/auth/register', { data: {
    nome: 'Responsável da casa', email: `convite-${randomUUID()}@integracao.rephouse.test`, senha: password,
  } })
  expect(signup.status()).toBe(201)
  const session = await signup.json() as Schemas['Sessao']
  const response = await request.post(api + '/republicas', { headers: { Authorization: `Bearer ${session.token}` }, data: { nome: 'Casa do convite' } })
  expect(response.status()).toBe(201)
  return await response.json() as Schemas['Republica']
}

test('cadastro para criar casa exige confirmação, gera código e preserva o vínculo após recarregar', async ({ page, request }) => {
  const email = await signup(page, 'criar')
  const before = await account(page, request)
  expect(before.me).toMatchObject({ email, membro: null, tipoUsuario: 'USUARIO_NORMAL' })
  await page.getByLabel('Nome da república', { exact: true }).fill('Casa compartilhada')
  await page.locator('.rep-house-form').getByRole('button', { name: 'Criar república', exact: true }).click()
  await expect(page).toHaveURL(/\/republica$/)
  await page.getByRole('link', { name: 'Moradores', exact: true }).first().click()
  await expect(page.locator('.rep-copy-label').first()).toHaveText('Código de entrada')
  const code = page.locator('.rep-copy code').first()
  await expect(code).toHaveText(/^[A-Z0-9]{6,32}$/)
  const savedCode = await code.textContent()
  const after = await account(page, request)
  expect(after.me.tipoUsuario).toBe('USUARIO_ADMIN')
  expect(after.me.membro).toBeTruthy()
  const house = await request.get(api + '/republicas/atual', { headers: after.headers })
  expect(await house.json()).toMatchObject({ nome: 'Casa compartilhada', codigoEntrada: savedCode, adminId: after.me.id })
  await page.reload()
  await expect(page.locator('.rep-copy code').first()).toHaveText(savedCode!)
})

test('cadastro com convite abre o campo do código e entra na república correta', async ({ page, request }) => {
  const house = await invite(request)
  const email = await signup(page, 'entrar')
  const before = await account(page, request)
  expect(before.me).toMatchObject({ email, membro: null })
  await expect(page.getByLabel('Nome da república', { exact: true })).toHaveCount(0)
  await page.getByLabel('Código de entrada', { exact: true }).fill(house.codigoEntrada.toLowerCase())
  await page.locator('.rep-house-form').getByRole('button', { name: 'Entrar na república', exact: true }).click()
  await expect(page).toHaveURL(/\/republica$/)
  await page.getByRole('link', { name: 'Moradores', exact: true }).first().click()
  await expect(page.locator('.rep-copy code').first()).toHaveText(house.codigoEntrada)
  const after = await account(page, request)
  expect(after.me.tipoUsuario).toBe('USUARIO_NORMAL')
  const current = await request.get(api + '/republicas/atual', { headers: after.headers })
  expect(await current.json()).toMatchObject({ id: house.id, codigoEntrada: house.codigoEntrada })
})

test('código inválido permite corrigir sem cadastrar outra conta e a escolha pode ser alterada', async ({ page, request }) => {
  const house = await invite(request)
  let registrations = 0
  page.on('request', req => { if (req.method() === 'POST' && req.url().endsWith('/api/auth/register')) registrations++ })
  await signup(page, 'criar')
  // A escolha é uma orientação: a pessoa pode mudar antes de concluir o vínculo.
  await page.getByRole('radio', { name: 'Tenho um convite', exact: true }).click()
  await page.getByLabel('Código de entrada', { exact: true }).fill('INVALIDO999')
  await page.locator('.rep-house-form').getByRole('button', { name: 'Entrar na república', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  const before = await account(page, request)
  expect(before.me.membro).toBeNull()
  await expect(page.locator('.rep-house-form').getByRole('button', { name: 'Entrar na república', exact: true })).toBeEnabled()
  await page.getByLabel('Código de entrada', { exact: true }).fill(house.codigoEntrada)
  await page.locator('.rep-house-form').getByRole('button', { name: 'Entrar na república', exact: true }).click()
  await expect(page).toHaveURL(/\/republica$/)
  const after = await account(page, request)
  expect(after.me.id).toBe(before.me.id)
  expect(after.me.membro).toBeTruthy()
  expect(registrations).toBe(1)
})

test('cadastro bloqueia a escolha e não envia a preferência à API nem duplica solicitações', async ({ page }) => {
  let release = () => {}, submissions = 0
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/auth/register', async route => {
    submissions++
    expect(Object.keys(route.request().postDataJSON() as object).sort()).toEqual(['email', 'nome', 'senha'])
    await gate
    await route.continue()
  })
  try {
    await page.goto('/cadastro')
    await page.getByLabel('Nome', { exact: true }).fill('Cadastro único')
    await page.getByLabel('E-mail', { exact: true }).fill(`unico-${randomUUID()}@integracao.rephouse.test`)
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByRole('radio', { name: 'Já tenho um código', exact: true }).check()
    await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Quero criar uma república', exact: true })).toBeDisabled()
    await expect(page.getByRole('radio', { name: 'Já tenho um código', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Aguarde…', exact: true })).toBeDisabled()
    await page.locator('.auth-form').evaluate(form => (form as HTMLFormElement).requestSubmit())
    expect(submissions).toBe(1)
    release()
    await expect(page).toHaveURL(/\/republica\?acao=entrar$/)
    await expect(page.getByLabel('Código de entrada', { exact: true })).toBeVisible()
    expect(submissions).toBe(1)
  } finally { release() }
})

test('escolha da república após cadastro fica utilizável em celular, tablet e computador', async ({ page }) => {
  const captures = '../.devops-local/interface/imagens/cadastro-republica'
  await mkdir(captures, { recursive: true })
  await signup(page, 'criar')
  for (const [width, height] of [[320, 740], [390, 844], [768, 900], [1366, 768], [1440, 900]]) {
    await page.setViewportSize({ width, height })
    await expect(page.getByRole('heading', { name: 'Oi, Moradora.', exact: true })).toBeVisible()
    await page.getByRole('radio', { name: 'Criar república', exact: true }).click()
    for (const name of ['Criar república', 'Tenho um convite']) {
      const fits = await page.getByRole('radio', { name, exact: true }).evaluate(control => {
        const label = control.querySelector('.lg-tab-text')!.getBoundingClientRect()
        const button = control.getBoundingClientRect()
        return label.width <= button.width && label.height <= button.height
      })
      expect(fits).toBe(true)
    }
    await expect(page.getByLabel('Nome da república', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `${captures}/criar-republica-${width}x${height}.png`, fullPage: true })
    await page.getByRole('radio', { name: 'Tenho um convite', exact: true }).click()
    await expect(page.getByLabel('Código de entrada', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `${captures}/entrar-republica-${width}x${height}.png`, fullPage: true })
  }
})
