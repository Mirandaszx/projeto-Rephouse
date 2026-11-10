import { test, expect, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import type { components } from '../../integracao/api.js'
import { contrast } from './auxiliares/contraste'

type Schemas = components['schemas']
const api = 'http://127.0.0.1:3405/api'
const password = 'Senha-interface-teste-2026'
const email = `painel-${randomUUID()}@integracao.rephouse.test`
let token = ''

test.beforeAll(async ({ request }) => {
  const response = await request.post(api + '/auth/register', { data: { nome: 'Camila Oliveira', email, senha: password } })
  expect(response.status()).toBe(201)
  token = (await response.json() as Schemas['Sessao']).token
  const headers = { Authorization: `Bearer ${token}` }
  const house = await request.post(api + '/republicas', { headers, data: { nome: 'República Jardim' } })
  expect(house.status()).toBe(201)
  const me = await request.get(api + '/me', { headers })
  const member = (await me.json() as Schemas['MinhaConta']).membro!
  for (let index = 1; index <= 8; index++) {
    const expense = await request.post(api + '/despesas', { headers, data: { titulo: `Despesa do painel ${index}`, categoria: 'Contas da casa', valorTotal: '10.00', vencimento: '2030-01-15', membroIds: [member.id] } })
    expect(expense.status()).toBe(201)
  }
  for (let index = 1; index <= 6; index++) {
    const task = await request.post(api + '/tarefas', { headers, data: { titulo: `Tarefa do painel ${index}`, responsavelId: member.id, prazo: `2030-01-${String(index + 10).padStart(2, '0')}` } })
    expect(task.status()).toBe(201)
    if (index === 6) {
      const saved = await task.json() as Schemas['Tarefa']
      expect((await request.patch(api + '/tarefas/' + saved.id, { headers, data: { status: 'CONCLUIDA' } })).status()).toBe(200)
    }
  }
})

async function enterDashboard(page: Page) {
  // Reutiliza a sessão real criada na preparação, sem multiplicar logins do mesmo IP.
  await page.goto('/login')
  await page.evaluate(value => sessionStorage.setItem('rephouse-token', value), token)
  await page.goto('/republica')
  await expect(page).toHaveURL(/\/republica$/)
  await expect(page.getByRole('region', { name: 'Resumo da república' })).toBeVisible()
}

test('visão geral resume dados reais e mantém despesas completas e convite nas páginas próprias', async ({ page, request }) => {
  await enterDashboard(page)
  const metrics = page.getByRole('region', { name: 'Resumo da república' })
  await expect(metrics.locator('.rep-metric')).toHaveCount(4)
  const dashboardResponse = await request.get(api + '/dashboard', { headers: { Authorization: `Bearer ${token}` } })
  const dashboard = await dashboardResponse.json() as Schemas['Painel']
  await expect(metrics.locator('.rep-metric').nth(0)).toContainText('80,00')
  await expect(metrics.locator('.rep-metric').nth(1)).toContainText('80,00')
  await expect(metrics.locator('.rep-metric').nth(3).locator('strong')).toHaveText(String(dashboard.tarefasAbertas))
  const expenses = page.getByRole('region', { name: 'Despesas recentes' })
  await expect(expenses.locator('li')).toHaveCount(5)
  await expect(expenses.locator('li').first()).toContainText('Despesa do painel 8')
  await expect(expenses).not.toContainText('Despesa do painel 1')
  const tasks = page.getByRole('region', { name: 'Tarefas pendentes' })
  await expect(tasks.locator('li')).toHaveCount(4)
  await expect(tasks).not.toContainText('Tarefa do painel 6')
  await expect(page.getByText('Código de entrada', { exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Ver todas as despesas', exact: true }).click()
  await expect(page.locator('#despesas li')).toHaveCount(8)
  await page.getByRole('radio', { name: 'Pagas', exact: true }).click()
  await expect(page.getByText('Nenhuma despesa neste filtro.', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Moradores', exact: true }).first().click()
  await expect(page.getByRole('region', { name: 'Convide um morador' })).toBeVisible()
  await expect(page.locator('.rep-copy code')).toHaveText(/^[A-Z0-9]{6,32}$/)
})

test('falha das tarefas mantém o resumo financeiro e permite tentar novamente', async ({ page }) => {
  let unavailable = true
  await page.route('**/api/tarefas', route => unavailable
    ? route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Indisponível' } } })
    : route.continue())
  await enterDashboard(page)
  await expect(page.getByRole('alert')).toHaveText('Não foi possível carregar as tarefas agora.')
  await expect(page.getByRole('region', { name: 'Despesas recentes' }).locator('li')).toHaveCount(5)
  await expect(page.getByRole('region', { name: 'Resumo da república' })).toContainText('80,00')
  unavailable = false
  await page.getByRole('button', { name: 'Tentar carregar tarefas', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Tarefas pendentes' }).locator('li')).toHaveCount(4)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('modais, campos flutuantes e seletores mantêm contraste nos temas claro e escuro', async ({ page }) => {
  test.setTimeout(90000)
  const captures = '../.devops-local/interface/imagens/aparencia'
  await mkdir(captures, { recursive: true })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await enterDashboard(page)
  for (const theme of ['light', 'dark']) {
    await page.getByRole('combobox', { name: 'Aparência', exact: true }).selectOption(theme)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Nova despesa', exact: true })
    await dialog.getByLabel('Descrição', { exact: true }).fill('Conta de exemplo')
    for (const input of [dialog.getByLabel('Descrição', { exact: true }), dialog.getByLabel('Categoria', { exact: true }), dialog.getByLabel('Valor total da despesa (R$)', { exact: true })]) {
      expect(await contrast(input)).toBeGreaterThanOrEqual(4.5)
      expect(await contrast(input, 'borderTopColor')).toBeGreaterThanOrEqual(3)
    }
    for (const label of await dialog.locator('.spell-label-floating').all()) expect(await contrast(label)).toBeGreaterThanOrEqual(4.5)
    expect(await contrast(dialog.getByRole('button', { name: 'Cancelar', exact: true }))).toBeGreaterThanOrEqual(4.5)
    expect(await contrast(dialog.getByRole('button', { name: 'Adicionar', exact: true }))).toBeGreaterThanOrEqual(4.5)
    expect(await contrast(page.getByRole('button', { name: 'Sair', exact: true }))).toBeGreaterThanOrEqual(4.5)
    expect(await dialog.locator('.spell-label-floating').first().evaluate(label => getComputedStyle(label).backgroundColor === getComputedStyle(label.parentElement!.querySelector('input')!).backgroundColor)).toBe(true)
    await dialog.getByRole('button', { name: 'Abrir calendário de Vencimento', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Calendário de Vencimento', exact: true })).toBeVisible()
    expect(await contrast(page.locator('.rep-calendar-popup'))).toBeGreaterThanOrEqual(4.5)
    await page.keyboard.press('Escape')
    await dialog.getByRole('button', { name: 'Abrir moradores do rateio', exact: true }).click()
    await expect(page.getByRole('option').first()).toBeVisible()
    expect(await contrast(page.locator('.rep-combobox-popup'))).toBeGreaterThanOrEqual(4.5)
    await page.keyboard.press('Escape')
    await page.screenshot({ path: `${captures}/nova-despesa-${theme}.png`, fullPage: true })
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.getByRole('link', { name: 'Tarefas', exact: true }).first().click()
    await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click()
    const task = page.getByRole('dialog', { name: 'Nova tarefa', exact: true })
    await task.getByLabel('Título', { exact: true }).fill('Organizar a sala')
    expect(await contrast(task.getByLabel('Título', { exact: true }))).toBeGreaterThanOrEqual(4.5)
    await task.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.getByRole('link', { name: 'Visão geral', exact: true }).first().click()
    await page.getByRole('button', { name: 'Pagar', exact: true }).first().click()
    const payment = page.getByRole('dialog', { name: 'Registrar pagamento', exact: true })
    expect(await contrast(payment.getByLabel('Valor pago (R$)', { exact: true }))).toBeGreaterThanOrEqual(4.5)
    await page.screenshot({ path: `${captures}/pagamento-${theme}.png`, fullPage: true })
    await payment.getByRole('button', { name: 'Cancelar', exact: true }).click()
  }
})

test('painel e páginas internas cabem no celular e logout continua revogando a sessão', async ({ page, request }) => {
  test.setTimeout(90000)
  const captures = '../.devops-local/interface/imagens/aparencia/painel-escuro'
  await mkdir(captures, { recursive: true })
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await enterDashboard(page)
  const currentToken = await page.evaluate(() => sessionStorage.getItem('rephouse-token'))
  for (const width of [320, 390, 768, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/republica', '/republica/despesas', '/republica/tarefas', '/republica/moradores']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible()
      if (path === '/republica') await expect(page.getByRole('region', { name: 'Tarefas pendentes' }).locator('li')).toHaveCount(4)
      if (path.endsWith('/tarefas')) await expect(page.getByRole('checkbox')).toHaveCount(6)
      if (path.endsWith('/moradores')) expect(await contrast(page.locator('.rep-copy button'))).toBeGreaterThanOrEqual(4.5)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} em ${width}`).toBe(true)
      if (width <= 390) {
        const navigation = page.getByRole('navigation', { name: 'Navegação da casa' })
        await expect(navigation).toBeInViewport()
        await expect(navigation.locator('[aria-current="page"]')).toBeVisible()
        await expect(navigation.getByRole('link')).toHaveCount(4)
      }
      await page.screenshot({ path: `${captures}/${path.split('/').pop()}-${width}.png`, fullPage: true })
    }
  }
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('rephouse-token'))).toBeNull()
  expect((await request.get(api + '/me', { headers: { Authorization: `Bearer ${currentToken}` } })).status()).toBe(401)
})
