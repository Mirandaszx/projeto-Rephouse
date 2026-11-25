import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { prepare } from './auxiliares/modernizacao-fixture'

// Instancia HTTP isolada por arquivo; os controles reais permanecem habilitados.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'impeccable-ajustes.spec.ts' } })

const shots = '../.devops-local/interface/imagens/impeccable-ajustes-2026-11-20'

test('despesa, pagamento e tarefa recebem foco após montar o formulário correto', async ({ page }) => {
  await prepare(page)
  await page.goto('/republica/despesas')
  await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Descrição', { exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: '＋ Nova despesa', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click()
  await expect(dialog.getByLabel('Valor pago (R$)', { exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'Tarefas', exact: true }).first().click()
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Título', { exact: true })).toBeFocused()
})

test('falha incerta tem um alerta, detalhes copiáveis e reenvio idêntico após reabrir', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { Object.assign(window, { copiedSupport: value }) } } })
  })
  const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const sends: { key?: string; body: string | null }[] = []
  await page.route('**/api/despesas', route => {
    if (route.request().method() !== 'POST') return route.fallback()
    sends.push({ key: route.request().headers()['idempotency-key'], body: route.request().postData() })
    return route.fulfill({ status: 503, headers: { 'X-Request-Id': requestId }, json: { error: { code: 'UNAVAILABLE', message: 'Banco temporariamente indisponível.' } } })
  })
  await page.goto('/republica/despesas')
  await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Descrição', { exact: true }).fill('Conta para conferência')
  await dialog.getByLabel('Valor total da despesa (R$)', { exact: true }).fill('100')
  await dialog.getByLabel('Vencimento', { exact: true }).fill('2030-01-10')
  await dialog.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveCount(1)
  await expect(dialog.getByRole('alert')).toContainText('Não foi possível confirmar se foi salvo')
  await expect(dialog.getByRole('alert')).not.toContainText(requestId)
  await expect(dialog.locator('.workspace-error-support code')).not.toBeVisible()
  await dialog.getByText('Detalhes para suporte', { exact: true }).click()
  await expect(dialog.locator('code')).toHaveText(requestId)
  await dialog.getByRole('button', { name: 'Copiar código', exact: true }).click()
  expect(await page.evaluate(() => (window as unknown as { copiedSupport: string }).copiedSupport)).toBe(requestId)
  await expect(dialog.getByLabel('Descrição', { exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Reenviar solicitação', exact: true }).click()
  await expect.poll(() => sends.length).toBe(2)
  expect(sends[0].key).toMatch(/^[\da-f-]{36}$/i)
  expect(sends[1]).toEqual(sends[0])
  await mkdir(shots, { recursive: true })
  await dialog.screenshot({ path: shots + '/erro-incerto-dark-390.png' })
})

test('moradores, tarefas e configurações funcionam sem consultar dashboard ou despesas', async ({ page }) => {
  await prepare(page)
  const unnecessary: string[] = []
  await page.route(/\/api\/(dashboard|despesas)(\?|$)/, route => {
    unnecessary.push(route.request().url())
    return route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Financeiro indisponível.' } } })
  })
  for (const [route, heading] of [['moradores', 'Moradores'], ['tarefas', 'Tarefas'], ['configuracoes', 'Configurações da república']]) {
    await page.goto('/republica/' + route)
    await expect(page.getByRole('heading', { name: heading, exact: true, level: 1 })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  }
  await expect(page.getByRole('button', { name: 'Salvar república', exact: true })).toBeVisible()
  expect(unnecessary).toEqual([])
})

for (const [due, state, label] of [
  ['2026-11-19', 'ATRASADA', 'Atrasada'],
  ['2026-11-20', 'VENCE_HOJE', 'Vence hoje'],
  ['2026-11-27', 'VENCE_EM_BREVE', 'Vence em breve'],
] as const) test(`painel mostra ${label} e pagamento parcial usando a referência do servidor`, async ({ page }) => {
  await prepare(page, { expenseReference: { due, day: '2026-11-20', state } })
  await page.goto('/republica')
  const pending = page.getByRole('region', { name: 'Minhas pendências', exact: true })
  await expect(pending.getByText(label, { exact: true })).toBeVisible()
  // Desde 25/11/2026 o parcial é texto, e a pendência tem um selo só (o do vencimento).
  await expect(pending).toContainText('Pagamento parcial')
  await expect(pending.locator('.workspace-badge')).toHaveCount(1)
  await expect(pending).toContainText('80,00')
})

test('endereço desconhecido explica a falha e conserva redirecionamentos antigos', async ({ page }) => {
  for (const route of ['/pagina-inexistente', '/republica/inexistente']) {
    await page.goto(route)
    await expect(page.getByRole('heading', { name: 'Página não encontrada.', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voltar ao início', exact: true })).toHaveAttribute('href', '/')
  }
  await page.goto('/novo/login')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.', exact: true })).toBeVisible()
})

test('aviso sem situação pronta usa a data civil do servidor, mesmo com relógio local diferente', async ({ page }) => {
  await prepare(page, { expenseReference: { due: '2030-03-07', day: '2030-02-28' } })
  await page.clock.setFixedTime(new Date('2040-10-01T12:00:00Z'))
  await page.goto('/republica')
  const pending = page.getByRole('region', { name: 'Minhas pendências', exact: true })
  await expect(pending.getByText('Vence em breve', { exact: true })).toBeVisible()
  // Desde 25/11/2026 o parcial é texto, e a pendência tem um selo só (o do vencimento).
  await expect(pending).toContainText('Pagamento parcial')
  await expect(pending.locator('.workspace-badge')).toHaveCount(1)
})
