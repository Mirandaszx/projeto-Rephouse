import { test, expect } from '@playwright/test'
import { prepare } from './auxiliares/modernizacao-fixture'
import { escolherMes } from './auxiliares/mes'

// Componentes do shadcn (variantes Base UI) adotados em 25/11/2026: Skeleton, Collapsible, AlertDialog, Tooltip e Drawer.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'shadcn.spec.ts' } })

test('carregando, a página mostra blocos no formato da tela, com o aviso para leitores de tela e sem pulsar com movimento reduzido', async ({ page }) => {
  await prepare(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/tarefas', async route => { await gate; await route.fallback() })
  await page.goto('/republica/tarefas')
  const loading = page.getByRole('status').filter({ hasText: 'Carregando tarefas…' })
  await expect(loading).toBeVisible()
  await expect(loading.locator('[data-slot="skeleton"]').first()).toBeVisible()
  expect(await loading.locator('[data-slot="skeleton"]').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none')
  release()
  await expect(page.locator('.rep-task-row').first()).toBeVisible()
  await expect(loading).toHaveCount(0)
})

test('"Contas recorrentes" abre e fecha pelo botão, pelo teclado e pelo aviso de revisão', async ({ page }) => {
  await prepare(page)
  await page.goto('/republica/despesas')
  const trigger = page.getByRole('button', { name: /^Contas recorrentes/ })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('Configurações mensais e meses que precisam de revisão.', { exact: true })).toBeVisible()
  await trigger.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText('Configurações mensais e meses que precisam de revisão.', { exact: true })).toBeHidden()
})

test('desativar vínculo pede confirmação como alerta: foco em "Cancelar", clique fora não fecha e Esc fecha', async ({ page }) => {
  await prepare(page)
  await page.goto('/republica/moradores')
  await page.getByRole('button', { name: 'Desativar vínculo de João Victor', exact: true }).click()
  const alert = page.getByRole('alertdialog', { name: 'Desativar vínculo', exact: true })
  await expect(alert).toBeVisible()
  await expect(alert).toContainText('João Victor deixará de ser morador ativo')
  await expect(alert.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused()
  await page.mouse.click(8, 8)
  await expect(alert).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(alert).toHaveCount(0)
})

test('botões só com ícone mostram o que fazem ao passar o mouse ou receber foco', async ({ page }) => {
  await prepare(page)
  await page.goto('/republica/moradores')
  await page.locator('.rep-copy button').hover()
  await expect(page.getByText('Copiar código', { exact: true })).toBeVisible()
  await page.goto('/republica/despesas')
  await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
  // Dentro da janela (camada do topo), a dica precisa nascer na própria janela para aparecer.
  await page.getByRole('button', { name: 'Abrir calendário de Vencimento', exact: true }).hover()
  await expect(page.locator('dialog[open]').getByText('Abrir calendário', { exact: true })).toBeVisible()
  await page.mouse.move(0, 0)
  await expect(page.locator('dialog[open]').getByText('Abrir calendário', { exact: true })).toBeHidden()
  // Pelo teclado: do campo seguinte, Shift+Tab volta ao botão e a dica aparece.
  await page.getByLabel('Repetir mensalmente', { exact: true }).focus()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Abrir calendário de Vencimento', exact: true })).toBeFocused()
  await expect(page.locator('dialog[open]').getByText('Abrir calendário', { exact: true })).toBeVisible()
})

test('no celular, os filtros de Despesas abrem num painel de baixo e o botão mostra o filtro escolhido', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/republica/despesas')
  await expect(page.getByRole('radiogroup', { name: 'Filtrar despesas da casa' })).toBeHidden()
  const trigger = page.getByRole('button', { name: 'Filtrar despesas: Todas · Todos os meses · Contas da casa', exact: true })
  await expect(trigger).toBeVisible()
  expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  await trigger.click()
  const drawer = page.getByRole('dialog', { name: 'Filtrar despesas', exact: true })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('combobox', { name: 'Situação', exact: true }).click()
  await page.getByRole('option', { name: 'Pagas', exact: true }).click()
  await escolherMes(page, '2025-03')
  await drawer.getByRole('button', { name: 'Ver despesas', exact: true }).click()
  await expect(drawer).toBeHidden()
  await expect(page.getByRole('button', { name: 'Filtrar despesas: Pagas · Março de 2025 · Contas da casa', exact: true })).toBeVisible()
  await expect(page.getByText('Nenhuma despesa neste filtro.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
