import { test, expect } from '@playwright/test'
import { prepare } from './auxiliares/modernizacao-fixture'

// Redesign de 24/11/2026: menu da conta no celular, filtro de mês, parte zerada e Modo simples.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'redesign.spec.ts' } })

test('no celular, um único avatar abre o menu da conta, que fecha com Esc e devolve o foco', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/republica')
  const trigger = page.getByRole('button', { name: /Abrir menu da conta/ })
  await expect(trigger).toBeVisible()
  await expect(page.locator('.workspace-profile-link')).toBeHidden()
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const menu = page.getByRole('navigation', { name: 'Sua conta' })
  await expect(menu.getByRole('link', { name: 'Meu perfil', exact: true })).toBeVisible()
  await expect(page.locator('.account-menu-panel').getByRole('button', { name: 'Sair', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('filtro de mês vazio mostra "Todos os meses" e continua aceitando um mês', async ({ page }) => {
  await prepare(page)
  await page.goto('/republica/despesas')
  const field = page.getByLabel('Mês do vencimento', { exact: true })
  await expect(field).toHaveValue('')
  await expect(page.locator('.month-filter-empty')).toHaveText('Todos os meses')
  await field.fill('2026-11')
  await expect(field).toHaveValue('2026-11')
  await expect(page.locator('.month-filter-empty')).toHaveCount(0)
})

test('com a parte zerada, a visão geral confirma "Você está em dia" em vez de destacar R$ 0,00', async ({ page }) => {
  await prepare(page, { empty: true })
  await page.goto('/republica')
  await expect(page.locator('.rep-metric-personal')).toContainText('Você está em dia')
  await expect(page.locator('.rep-metric-personal strong')).not.toContainText('R$')
})

test('Modo simples mostra só o essencial, com ações grandes, e a escolha fica salva no aparelho', async ({ page }) => {
  await prepare(page)
  await page.goto('/republica')
  await page.getByRole('button', { name: 'Usar modo simples', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'O que você quer fazer' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Resumo da república' })).toHaveCount(0)
  for (const action of await page.locator('.simple-actions > *').all()) expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(64)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Contas para pagar', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Ver todas as informações (modo completo)', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Resumo da república' })).toBeVisible()
})

test('movimentos do redesign: menu nasce do avatar, troca de modo entra e recebe foco, e nada se move com movimento reduzido', async ({ page }) => {
  await prepare(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/republica')
  // Menu da conta: entrada a partir do canto do avatar, só por ponteiro.
  await page.getByRole('button', { name: /Abrir menu da conta/ }).click()
  const panel = page.locator('.account-menu-panel')
  expect(await panel.evaluate(element => getComputedStyle(element).transformOrigin)).toMatch(/px 0px$/)
  expect(await panel.evaluate(element => element.getAnimations().length)).toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  // Troca de modo: o bloco novo entra uma vez e recebe o foco.
  await page.getByRole('button', { name: 'Usar modo simples', exact: true }).click()
  const view = page.locator('.mode-view')
  await expect(view).toBeFocused()
  await expect(view).toHaveAttribute('aria-label', 'Modo simples')
  // Toque nos botões grandes: transição curta de transform, sem animar outras propriedades.
  expect(await page.locator('.simple-actions > *').first().evaluate(element => getComputedStyle(element).transitionProperty)).toBe('transform')
  await page.getByRole('button', { name: 'Ver todas as informações (modo completo)', exact: true }).click()
  // "Seu mês" usa scaleX: a largura da barra não muda com o valor.
  const fill = page.locator('.rep-meter span')
  if (await fill.count()) {
    expect(await fill.evaluate(element => element.style.transform)).toMatch(/^scaleX\(/)
    expect(await fill.evaluate(element => getComputedStyle(element).transitionProperty)).toBe('transform')
  }
  // Movimento reduzido: o menu abre sem animação.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: /Abrir menu da conta/ }).click()
  expect(await panel.evaluate(element => element.getAnimations().filter(animation => (animation.effect?.getTiming().duration ?? 0) as number > 0).length)).toBe(0)
})
