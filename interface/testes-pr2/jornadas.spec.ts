import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import type { components } from '../../integracao/api.js'
import { mkdir } from 'node:fs/promises'

type Schemas = components['schemas']
const password = 'Senha-interface-teste-2026'
const api = 'http://127.0.0.1:3405/api'
// A comparação opcional usa a cópia original do PR; a suíte principal usa as rotas atuais.
const original = process.env.PR2_REFERENCE_ROUTES === '1'
const loginPath = original ? '/novo/login' : '/login'
const signupPath = original ? '/novo/cadastro' : '/cadastro'
const adminPath = original ? '/novo/admin' : '/admin'
let memberToken = '', memberId = '', republicId = '', expenseId = ''

async function call<T>(request: APIRequestContext, path: string, token: string, data?: unknown): Promise<T> {
  const response = await request.fetch(api + path, { method: data ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, data })
  expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy()
  return await response.json() as T
}

async function login(page: Page, account: string) {
  await page.goto(loginPath)
  await page.getByLabel('E-mail', { exact: true }).fill(`${account}@integracao.rephouse.test`)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: /^Entrar(?: na minha conta)?$/ }).click()
  await expect(page).toHaveURL(original ? /\/novo\/?$/ : /\/republica\/?$/)
}

test.beforeAll(async ({ request }) => {
  const admin = await call<Schemas['Sessao']>(request, '/auth/login', '', { email: 'admin.aurora@integracao.rephouse.test', senha: password })
  const member = await call<Schemas['Sessao']>(request, '/auth/login', '', { email: 'ana@integracao.rephouse.test', senha: password })
  memberToken = member.token
  const adminAccount = await call<Schemas['MinhaConta']>(request, '/me', admin.token)
  const republic = adminAccount.membro
    ? await call<Schemas['Republica']>(request, '/republicas/atual', admin.token)
    : await call<Schemas['Republica']>(request, '/republicas', admin.token, { nome: 'Aurora integração PR2' })
  republicId = republic.id
  if (!(await call<Schemas['MinhaConta']>(request, '/me', member.token)).membro) await call(request, '/republicas/entrar', member.token, { codigoEntrada: republic.codigoEntrada })
  const me = await call<Schemas['MinhaConta']>(request, '/me', member.token)
  expect(me.membro).toBeTruthy(); memberId = me.membro!.id
  const tasks = await call<{ dados: Schemas['Tarefa'][] }>(request, '/tarefas?limite=100', admin.token)
  for (let index = 0; index < 25; index++) if (!tasks.dados.some(task => task.titulo === `Rotina ${index + 1}`)) await call(request, '/tarefas', admin.token, { titulo: `Rotina ${index + 1}`, responsavelId: memberId })
  const expenses = await call<{ dados: Schemas['Despesa'][] }>(request, '/despesas', admin.token)
  const expense = expenses.dados.find(item => item.titulo === 'Internet integração PR2') ?? await call<Schemas['Despesa']>(request, '/despesas', admin.token, { titulo: 'Internet integração PR2', categoria: 'Serviços', valorTotal: '50.00', vencimento: '2030-01-15', membroIds: [memberId] })
  expenseId = expense.id
})

test('morador vê mais de 20 tarefas e conclui a própria tarefa na API real', async ({ page, request }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await login(page, 'ana')
  await page.getByRole('link', { name: 'Tarefas', exact: true }).first().click()
  await expect(page.getByRole('checkbox')).toHaveCount(25)
  await page.getByText('Rotina 25', { exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Rotina 25', exact: true })).toBeChecked()
  await expect(page.getByRole('status').filter({ hasText: 'Tarefa concluída.' })).toBeVisible()
  const tasks = await call<{ dados: Schemas['Tarefa'][] }>(request, '/tarefas?limite=100', memberToken)
  expect(tasks.dados.find(task => task.titulo === 'Rotina 25')?.status).toBe('CONCLUIDA')
  expect(errors).toEqual([])
})

test('pagamento com arquivo pelo frontend persiste e pode ser baixado', async ({ page, request }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await login(page, 'ana')
  await page.getByRole('button', { name: 'Pagar', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar pagamento' })
  await dialog.getByLabel('Valor pago (R$)', { exact: true }).fill('20.00')
  const bytes = Buffer.from('%PDF-1.4\ncomprovante sintético PR2\n%%EOF')
  await dialog.locator('input[type=file]').setInputFiles({ name: 'comprovante.pdf', mimeType: 'application/pdf', buffer: bytes })
  const paymentResponse = page.waitForResponse(response => response.url().endsWith('/api/pagamentos') && response.request().method() === 'POST')
  await dialog.getByRole('button', { name: 'Registrar', exact: true }).click()
  expect((await paymentResponse).status()).toBe(201)
  // A região live tem altura zero; o aviso visível é seu filho com position:fixed.
  await expect(page.getByText('Pagamento registrado.')).toBeVisible()
  const expense = await call<Schemas['Despesa']>(request, `/despesas/${expenseId}`, memberToken)
  const share = expense.rateios.find(item => item.membroId === memberId)!
  expect(share.valorPago).toBe('20.00')
  const receipt = await request.get(api.replace(/\/api$/, '') + share.pagamentos![0]!.comprovanteUrl, { headers: { Authorization: `Bearer ${memberToken}` } })
  expect(receipt.status()).toBe(200); expect(await receipt.body()).toEqual(bytes)
  expect(errors).toEqual([])
})

test('MASTER consulta diretórios reais e morador não acessa administração', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await login(page, 'master')
  await expect(page.getByText('Repúblicas cadastradas', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Repúblicas', exact: true }).first().click()
  await expect(page.getByText('Aurora integração PR2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Usuários', exact: true }).first().click()
  await expect(page.getByText('ana@integracao.rephouse.test', { exact: true })).toBeVisible()
  expect(republicId).toBeTruthy()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL(original ? /\/novo\/login$/ : /\/login$/)
  await login(page, 'ana')
  await page.goto(adminPath)
  await expect(page.getByText('Esta área exige uma conta de administrador master.')).toBeVisible()
  expect(errors).toEqual([])
})

test('campo flutuante interno continua criando tarefa após a variante do login', async ({ page, request }) => {
  await login(page, 'admin.aurora')
  await page.getByRole('link', { name: 'Tarefas', exact: true }).first().click()
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova tarefa', exact: true })
  await dialog.getByLabel('Título', { exact: true }).fill('Organizar a sala')
  await dialog.getByRole('button', { name: 'Selecionar responsável — abrir opções', exact: true }).click()
  await page.getByRole('option', { name: 'Integração ana', exact: true }).click()
  await dialog.getByRole('button', { name: 'Criar tarefa', exact: true }).click()
  await expect(page.getByText('Tarefa criada.', { exact: true })).toBeVisible()
  const tasks = await call<{ dados: Schemas['Tarefa'][] }>(request, '/tarefas?limite=100', memberToken)
  expect(tasks.dados.find(task => task.titulo === 'Organizar a sala')).toMatchObject({ responsavelId: memberId, status: 'ABERTA' })
})

test('home, login e cadastro do PR mantêm o layout em celular e computador', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await mkdir('../.devops-local/interface/imagens/login-casinha-pr2/regressao', { recursive: true })
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', loginPath, signupPath]) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path}: largura ${width}`).toBe(true)
      if (path !== '/') {
        await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
        await page.getByLabel('E-mail', { exact: true }).focus()
        await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused()
      }
      if ((width === 1440 && path === '/') || (width === 390 && path === loginPath)) {
        await expect.poll(() => page.locator('h1').evaluate(title => Array.from(title.querySelectorAll('span')).every(span => {
          const style = getComputedStyle(span)
          return style.opacity === '1' && (style.filter === 'none' || style.filter === 'blur(0px)')
        }))).toBe(true)
        await page.screenshot({ path: `../.devops-local/interface/imagens/login-casinha-pr2/regressao/${width === 1440 ? 'home-desktop' : 'login-mobile'}.png`, fullPage: true })
      }
    }
  }
  expect(errors).toEqual([])
})
