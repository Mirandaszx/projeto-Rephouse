import { test, expect, type Page } from '@playwright/test'

// Instância própria da API, como em produção sem envio de e-mail: só o Google cria contas.
const runId = process.env.REPHOUSE_INTERFACE_TEST_RUN ?? ''
test.use({ extraHTTPHeaders: { 'x-interface-test-run': runId, 'x-interface-suite': 'google.spec.ts' } })

// Troca a biblioteca do Google por uma equivalente: guarda a configuração do initialize e desenha um botão que
// devolve a credencial assinada pelo harness para o nonce que a página recebeu da API.
const bibliotecaFalsa = `window.google = { accounts: { id: {
  initialize(config) { window.__googleConfig = config },
  renderButton(parent, options) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = options.text === 'signup_with' ? 'Cadastrar com o Google' : 'Fazer login com o Google'
    button.onclick = async () => {
      const config = window.__googleConfig
      config.callback({ credential: await window.__credencialGoogle(config.nonce) })
    }
    parent.appendChild(button)
  },
} } }`

async function prepararGoogle(page: Page, conta: { email: string; nome?: string; sub?: string }) {
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'text/javascript', body: bibliotecaFalsa }))
  await page.exposeFunction('__credencialGoogle', async (nonce: string) => {
    const params = new URLSearchParams({ nonce, email: conta.email, ...(conta.nome ? { nome: conta.nome } : {}), ...(conta.sub ? { sub: conta.sub } : {}) })
    const resposta = await page.request.get(`http://127.0.0.1:3405/__interface_google?${params}`, { headers: { 'x-interface-test-run': runId } })
    expect(resposta.ok()).toBe(true)
    return (await resposta.json()).credential as string
  })
}

test('sem e-mail, o cadastro acontece pelo Google e respeita a escolha da república', async ({ page }) => {
  await prepararGoogle(page, { email: 'nova.google@integracao.rephouse.test', nome: 'Nova Google', sub: 'sub-nova-google' })
  await page.goto('/cadastro')
  await expect(page.getByText('Crie sua conta com o Google', { exact: false })).toBeVisible()
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Criar minha conta', exact: true })).toHaveCount(0)
  await expect(page.getByText('O cadastro está temporariamente indisponível', { exact: false })).toHaveCount(0)
  await page.getByText('Já tenho um código', { exact: true }).click()
  await page.getByRole('button', { name: 'Cadastrar com o Google', exact: true }).click()
  await expect(page).toHaveURL(/\/republica\?acao=entrar$/)
  expect(await page.evaluate(() => sessionStorage.getItem('rephouse-token'))).toBeTruthy()

  // A mesma identidade Google entra direto pela tela de login, sem senha.
  await page.evaluate(() => sessionStorage.clear())
  await page.goto('/login')
  await expect(page.getByText('ou', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Fazer login com o Google', exact: true }).click()
  await expect(page).toHaveURL(/\/republica$/)
})

test('conta antiga com senha confirma a senha uma vez para ligar o Google', async ({ page }) => {
  await prepararGoogle(page, { email: 'gestao-google-vinculo@integracao.rephouse.test', sub: 'sub-vinculo' })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Fazer login com o Google', exact: true }).click()
  await expect(page.getByText('Já existe uma conta RepHouse com este e-mail', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Senha da conta', { exact: true })).toBeFocused()
  expect(await page.evaluate(() => sessionStorage.getItem('rephouse-token'))).toBeNull()

  await page.getByLabel('Senha da conta', { exact: true }).fill('Senha-errada-2026')
  await page.getByRole('button', { name: 'Ligar o Google e entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Senha incorreta')
  await expect(page.getByLabel('Senha da conta', { exact: true })).toBeVisible()

  await page.getByLabel('Senha da conta', { exact: true }).fill('Senha-interface-teste-2026')
  await page.getByRole('button', { name: 'Ligar o Google e entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/republica$/)

  // Ligado: o próximo acesso pelo Google não pede senha.
  await page.evaluate(() => sessionStorage.clear())
  await page.goto('/login')
  await page.getByRole('button', { name: 'Fazer login com o Google', exact: true }).click()
  await expect(page).toHaveURL(/\/republica$/)
})

test('se o Google não carregar, a tela avisa e o login com senha continua disponível', async ({ page }) => {
  await page.route('https://accounts.google.com/gsi/client', route => route.abort())
  await page.goto('/login')
  await expect(page.getByText('O acesso com Google não carregou agora', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar na minha conta', exact: true })).toBeEnabled()
})

test('cadastro pelo Google cabe no celular sem rolagem lateral', async ({ page }) => {
  await prepararGoogle(page, { email: 'celular.google@integracao.rephouse.test' })
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/cadastro')
  await expect(page.getByRole('button', { name: 'Cadastrar com o Google', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
