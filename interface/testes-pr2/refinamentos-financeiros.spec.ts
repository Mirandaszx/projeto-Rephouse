import { test, expect } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { prepare } from './auxiliares/modernizacao-fixture'
import type { components } from '../../integracao/api'
import { contrast } from './auxiliares/contraste'

// Instancia HTTP isolada por arquivo; os controles reais permanecem habilitados.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'refinamentos-financeiros.spec.ts' } })

type Schemas = components['schemas']
const api = 'http://127.0.0.1:3405/api'
const shots = '../.devops-local/interface/imagens/impeccable-polimento'

test('prévia de R$ 100 entre três moradores coincide com o rateio persistido', async ({ page, request }) => {
  const accounts = JSON.parse(await readFile('../.devops-local/interface/gestao-contas.json', 'utf8')) as Record<string, { token: string }>
  const headers = { Authorization: `Bearer ${accounts['polimento-admin'].token}` }
  const creation = await request.post(api + '/republicas', { headers, data: { nome: 'Casa Conferência do Rateio' } })
  expect(creation.status()).toBe(201)
  const house = await creation.json() as Schemas['Republica']
  for (const name of ['polimento-ana', 'polimento-bruno']) {
    expect((await request.post(api + '/republicas/entrar', { headers: { Authorization: `Bearer ${accounts[name].token}` }, data: { codigoEntrada: house.codigoEntrada } })).status()).toBe(201)
  }
  await page.goto('/login')
  await page.evaluate(token => sessionStorage.setItem('rephouse-token', token), accounts['polimento-admin'].token)
  await page.goto('/republica')
  await page.getByRole('button', { name: 'Registrar primeira despesa', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova despesa', exact: true })
  await dialog.getByLabel('Descrição', { exact: true }).fill('Conta com centavos conferidos')
  await dialog.getByLabel('Valor total da despesa (R$)', { exact: true }).fill('100.00')
  await dialog.getByLabel('Vencimento', { exact: true }).fill('2030-02-10')
  const preview = dialog.getByRole('region', { name: 'Conferência do rateio' })
  await expect(preview.locator('li')).toHaveCount(3)
  await expect(preview.getByText('R$ 33,34', { exact: true })).toHaveCount(1)
  await expect(preview.getByText('R$ 33,33', { exact: true })).toHaveCount(2)
  await dialog.getByLabel('Valor total da despesa (R$)', { exact: true }).fill('0.01')
  await expect(preview.getByRole('status')).toContainText('pelo menos R$ 0,01')
  await dialog.getByLabel('Valor total da despesa (R$)', { exact: true }).fill('100.00')
  await dialog.getByRole('button', { name: 'Abrir moradores do rateio', exact: true }).click()
  await page.getByRole('option', { name: 'Gestão polimento-bruno', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(preview.locator('li')).toHaveCount(2)
  await expect(preview.getByText('R$ 50,00', { exact: true })).toHaveCount(2)
  await dialog.getByRole('button', { name: 'Abrir moradores do rateio', exact: true }).click()
  await page.getByRole('option', { name: 'Gestão polimento-bruno', exact: true }).click()
  await page.keyboard.press('Escape')
  const expected = await preview.locator('li').evaluateAll(rows => rows.map(row => ({ name: row.querySelector('span')!.textContent, amount: row.querySelector('strong')!.textContent })))
  await dialog.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  const expenses = await (await request.get(api + '/despesas', { headers })).json() as { dados: Schemas['Despesa'][] }
  const members = await (await request.get(api + '/membros', { headers })).json() as { dados: Schemas['MembroListado'][] }
  expect(expenses.dados).toHaveLength(1)
  for (const share of expenses.dados[0].rateios) {
    const member = members.dados.find(item => item.id === share.membroId)!
    expect(expected.find(item => item.name === member.usuario.nome)?.amount).toBe(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(share.valorDevido)))
  }
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click()
  const payment = page.getByRole('dialog', { name: 'Registrar pagamento', exact: true })
  await expect(payment).toContainText('O RepHouse não transfere dinheiro.')
  await payment.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('link', { name: 'Despesas', exact: true }).first().click()
  await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
  await expect(dialog.getByLabel('Valor total da despesa (R$)', { exact: true })).toHaveValue('')
  await expect(dialog.getByRole('region', { name: 'Conferência do rateio' })).toContainText('Informe um valor válido')
})

test('pendências mantêm título legível e não repetem a mesma conta nos recentes', async ({ page }) => {
  await prepare(page)
  await mkdir(shots, { recursive: true })
  for (const width of [320, 390, 768, 1024, 1440]) for (const colorScheme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/republica')
    const pending = page.getByRole('region', { name: 'Minhas pendências', exact: true })
    await expect(pending.getByText('Internet da casa', { exact: true })).toBeVisible()
    if (width <= 390) {
      const bounds = await pending.locator('.finance-pending-row').evaluate(row => {
        const description = row.querySelector('div')!.getBoundingClientRect(), button = row.querySelector('button')!.getBoundingClientRect()
        return { width: description.width, below: button.top >= description.bottom }
      })
      expect(bounds.width).toBeGreaterThan(width - 115)
      expect(bounds.below).toBe(true)
    }
    await expect(page.getByRole('region', { name: 'Despesas recentes' }).getByText('Internet da casa', { exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.screenshot({ path: `${shots}/painel-${colorScheme}-${width}.png`, fullPage: true })
  }
})

test('cinco filtros continuam acessíveis no celular sem barra ou botões laterais', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/republica/despesas')
  await expect(page.getByLabel('Mês do vencimento', { exact: true })).toBeVisible()
  await expect(page.getByText('Deslize ou use as setas para ver todos os filtros.', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Mostrar (mais filtros|filtros anteriores)/ })).toHaveCount(0)
  const scroller = page.locator('.finance-filters')
  expect(await scroller.evaluate(element => getComputedStyle(element).scrollbarWidth)).toBe('none')
  await page.getByRole('radio', { name: 'Todas', exact: true }).focus()
  for (let index = 0; index < 4; index++) await page.keyboard.press('ArrowRight')
  await expect.poll(() => scroller.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
  await page.getByRole('radio', { name: 'Pagas', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Pagas', exact: true })).toBeChecked()
  await expect(page.getByText('Nenhuma despesa neste filtro.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

test('revisões de recorrência são avisadas mesmo com a seção recolhida, com consultas limitadas', async ({ page }) => {
  await prepare(page)
  let reviewed = false, inFlight = 0, maximum = 0, createdExpenses = 0
  const recurring = Array.from({ length: 7 }, (_, index) => ({ id: `rec-${index}`, ativa: true, pausaMotivo: index === 1 ? 'PARTICIPANTE_INATIVO' : null, proximaCompetencia: '2026-12', configuracoes: [{ titulo: `Conta mensal ${index}`, valorTotal: '100.00', diaVencimento: 10, vigencia: '2026-11', membroIds: ['m1', 'm2'] }] }))
  await page.route('**/api/recorrencias**', async route => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === 'POST') { reviewed = true; return route.fulfill({ status: 204 }) }
    if (path === '/api/recorrencias') return route.fulfill({ json: recurring })
    inFlight++; maximum = Math.max(maximum, inFlight)
    await new Promise(resolve => setTimeout(resolve, 30))
    inFlight--
    return route.fulfill({ json: path.includes('rec-0/') && !reviewed ? [{ competencia: '2026-10', estado: 'PENDENTE_REVISAO' }] : [] })
  })
  await page.route('**/api/despesas', async route => { if (route.request().method() === 'POST') createdExpenses++; await route.fallback() })
  await page.goto('/republica/despesas')
  const recurringSection = page.getByRole('region', { name: 'Contas recorrentes', exact: true })
  await expect(recurringSection.getByText('2 recorrências precisam de revisão.', { exact: true })).toBeVisible()
  expect(maximum).toBeLessThanOrEqual(4)
  await expect(recurringSection.locator('details')).not.toHaveAttribute('open')
  await recurringSection.getByRole('button', { name: 'Conferir recorrências', exact: true }).click()
  const row = recurringSection.locator('article').filter({ hasText: 'Conta mensal 0' })
  await row.getByRole('button', { name: 'Ver meses', exact: true }).click()
  await recurringSection.getByRole('button', { name: 'Marcar como revisada', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Revisar mês', exact: true })
  await expect(dialog).toContainText('não altera saldos')
  await dialog.getByRole('button', { name: 'Confirmar revisão', exact: true }).click()
  await expect(recurringSection.getByText('Uma recorrência precisa de revisão.', { exact: true })).toBeVisible()
  expect(createdExpenses).toBe(0)
})

test('textos auxiliares preservam contraste e tamanho na home e no acesso', async ({ page }) => {
  await mkdir(shots, { recursive: true })
  for (const width of [320, 390, 768, 1440]) for (const colorScheme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/')
    for (const selector of ['.rh-hero-reassurance', '.rh-footer > small', '.rh-section-label', '.rh-preview-list small', '.rh-preview-bottom', '.rh-split-visual > small']) {
      const text = page.locator(selector).first()
      expect(await text.evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(12)
      expect(await contrast(text)).toBeGreaterThanOrEqual(4.5)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.screenshot({ path: `${shots}/home-${colorScheme}-${width}.png`, fullPage: true })
    await page.goto('/login')
    expect(await page.locator('.auth-panel-footer').evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(12)
    expect(await contrast(page.locator('.auth-reassurance'))).toBeGreaterThanOrEqual(4.5)
  }
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/login')
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true)
})
