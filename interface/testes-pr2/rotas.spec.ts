import { test, expect } from '@playwright/test'

test('links públicos usam login e cadastro definitivos', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('a[href^="/novo"]')).toHaveCount(0)
  await page.getByRole('link', { name: 'Entrar', exact: true }).first().click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click()
  await expect(page).toHaveURL(/\/cadastro$/)
  await page.getByRole('link', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('favoritos antigos redirecionam para todas as rotas definitivas', async ({ page, request }) => {
  const response = await request.post('http://127.0.0.1:3405/api/auth/login', { data: {
    email: 'ana@integracao.rephouse.test', senha: 'Senha-interface-teste-2026',
  } })
  expect(response.status()).toBe(200)
  const session = await response.json() as { token: string }
  await page.addInitScript(token => sessionStorage.setItem('rephouse-token', token), session.token)
  const routes = [
    ['/novo', '/republica'], ['/novo/login', '/login'], ['/novo/cadastro', '/cadastro'],
    ['/novo/despesas', '/republica/despesas'], ['/novo/tarefas', '/republica/tarefas'],
    ['/novo/moradores', '/republica/moradores'], ['/novo/admin', '/admin'],
  ]
  for (const [previous, current] of routes) {
    await page.goto(previous!)
    await expect(page).toHaveURL(url => url.pathname === current)
  }
})

test('redirecionamento conserva query e fragmento e protege páginas privadas', async ({ page }) => {
  await page.goto('/novo/login/?origem=marcador#formulario')
  await expect(page).toHaveURL(/\/login\?origem=marcador#formulario$/)
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.', exact: true })).toBeVisible()
  await page.goto('/republica/tarefas')
  await expect(page).toHaveURL(/\/login$/)
})
