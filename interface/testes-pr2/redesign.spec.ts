import { test, expect } from '@playwright/test'
import { prepare } from './auxiliares/modernizacao-fixture'
import { escolherMes, filtroDeMes } from './auxiliares/mes'

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

test('filtro de mês e ano começa em "Todos os meses", escolhe um mês de outro ano e volta ao início', async ({ page }) => {
  await prepare(page)
  await page.goto('/republica/despesas')
  const filtro = filtroDeMes(page)
  await expect(filtro).toHaveAccessibleName('Mês do vencimento Todos os meses')
  // Nada para digitar: mês e ano são escolhidos com o toque, em qualquer navegador.
  await expect(page.locator('.month-filter input')).toHaveCount(0)
  const pedido = page.waitForRequest(request => request.url().includes('competencia=2025-03'))
  await escolherMes(page, '2025-03')
  await pedido
  await expect(filtro).toHaveAccessibleName('Mês do vencimento Março de 2025')
  await expect(filtro).toBeFocused()
  // Ao reabrir, o seletor mostra o ano e o mês escolhidos.
  await filtro.click()
  await expect(page.getByRole('button', { name: 'Março de 2025', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Todos os meses', exact: true }).click()
  await expect(filtro).toHaveAccessibleName('Mês do vencimento Todos os meses')
})

test('com a parte zerada, a visão geral confirma "Você está em dia" em vez de destacar R$ 0,00', async ({ page }) => {
  await prepare(page, { empty: true })
  await page.goto('/republica')
  await expect(page.locator('.rep-metric-personal')).toContainText('Você está em dia')
  await expect(page.locator('.rep-metric-personal strong')).not.toContainText('R$')
})

test('nos formulários de nova despesa e nova tarefa, cada campo fica separado do anterior e a seta da busca fica no canto', async ({ page }) => {
  await prepare(page)
  const gaps = () => page.locator('.rep-dialog[open] .rep-form-fields').evaluate(fields => {
    const boxes = [...fields.children].map(child => child.getBoundingClientRect()).filter(box => box.height > 0)
    return boxes.slice(1).map((box, index) => Math.round(box.top - boxes[index].bottom))
  })
  await page.goto('/republica/despesas')
  await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Nova despesa', exact: true })).toBeVisible()
  const expense = await gaps()
  expect(expense.length).toBeGreaterThanOrEqual(4)
  for (const gap of expense) expect(gap).toBeGreaterThanOrEqual(16)
  const combobox = (await page.locator('.rep-dialog[open] .rep-combobox').boundingBox())!
  const arrow = (await page.getByRole('button', { name: 'Abrir moradores do rateio', exact: true }).boundingBox())!
  expect(combobox.x + combobox.width - (arrow.x + arrow.width)).toBeLessThanOrEqual(8)
  await page.goto('/republica/tarefas')
  await page.getByRole('button', { name: /Nova tarefa/ }).first().click()
  const task = await gaps()
  expect(task.length).toBeGreaterThanOrEqual(2)
  for (const gap of task) expect(gap).toBeGreaterThanOrEqual(16)
})

test('na lista de despesas, as colunas ficam centralizadas e o valor da sua parte não se repete', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  // A conta inteira é sua: repetir o total acima do botão não informa nada.
  const own = { id: 'd1', titulo: 'internet', categoria: 'Contas da casa', valorTotal: '200.00', vencimento: '2026-11-30T00:00:00Z', criadaEm: '2026-11-01T00:00:00Z', dataReferencia: '2026-11-25', situacaoVencimento: 'PROXIMA', rateios: [{ id: 'r1', membroId: 'm1', valorDevido: '200.00', valorPago: '0.00' }] }
  const shared = { ...own, id: 'd2', titulo: 'energia', rateios: [{ id: 'r2', membroId: 'm1', valorDevido: '50.00', valorPago: '0.00' }] }
  await page.route(url => url.pathname === '/api/despesas', route => route.fulfill({ json: [own, shared] }))
  await page.goto('/republica/despesas')
  const row = page.locator('#despesas li').filter({ hasText: 'internet' })
  const button = row.getByRole('button', { name: 'Registrar pagamento', exact: true })
  await expect(button).toBeVisible()
  await expect(row.locator('.rep-share-due small')).toHaveCount(0)
  // Quando a sua parte é diferente do total, ela continua visível.
  await expect(page.locator('#despesas li').filter({ hasText: 'energia' }).locator('.rep-share-due small')).toHaveText(/^Sua parte: R\$\s50,00$/)
  const boxes = await row.evaluate(element => {
    const box = (node: Element) => { const rect = node.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, top: rect.top, bottom: rect.bottom } }
    const one = (selector: string) => box(element.querySelector(selector)!)
    const text = (selector: string) => { const range = document.createRange(); range.selectNodeContents(element.querySelector(selector)!); return range.getClientRects()[0] }
    const heads = [...document.querySelectorAll('.workspace-expense-columns > span')].map(box)
    return { row: box(element), date: one('.workspace-expense-due time'), badge: one('.workspace-expense-due > :last-child'), due: one('.workspace-expense-due'),
      name: one('.rep-expense-name div'), amount: one('.rep-amount strong'), button: one('.rep-share-due button'), heads, gap: text('.rep-expense-name small').top - text('.rep-expense-detail-link').bottom }
  })
  // Na vertical, tudo no meio da linha.
  for (const part of [boxes.name, boxes.due, boxes.amount, boxes.button]) expect(Math.abs(part.y - boxes.row.y)).toBeLessThanOrEqual(4)
  // Na horizontal, a situação fica centralizada com a data, e cada coluna com o seu título.
  expect(Math.abs(boxes.badge.x - boxes.date.x)).toBeLessThanOrEqual(2)
  for (const [index, part] of [boxes.due, boxes.amount, boxes.button].entries()) expect(Math.abs(part.x - boxes.heads[index + 1].x)).toBeLessThanOrEqual(3)
  expect(boxes.gap).toBeLessThanOrEqual(12)
  expect((await row.locator('.rep-expense-detail-link').boundingBox())!.height).toBeGreaterThanOrEqual(44)
})

test('melhorias de 25/11: gráfico sem barras falsas, um selo por pendência, detalhes com um botão só, menu lateral e avatar no topo', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/republica')
  // 1) Meses sem conta não desenham barra; com todos vazios, uma frase explica e o cartão usa a largura toda.
  const chart = page.getByRole('region', { name: 'Despesas da casa por mês', exact: true })
  await expect(chart.getByText('Nenhuma conta venceu nesses meses.', { exact: true })).toBeVisible()
  await expect(chart.locator('.rep-bars')).toHaveCount(0)
  const main = (await page.locator('.rep-metrics').boundingBox())!, card = (await chart.boundingBox())!
  expect(Math.abs(card.width - main.width)).toBeLessThanOrEqual(2)
  // 2) Uma pendência, um selo; o pagamento parcial vira texto.
  const pending = page.getByRole('region', { name: 'Minhas pendências', exact: true })
  await expect(pending.locator('.finance-pending-row').first().locator('.workspace-badge')).toHaveCount(1)
  await expect(pending).toContainText('Pagamento parcial')
  // O avatar do topo continua na Visão geral (pedido de 25/11/2026) e leva ao perfil.
  await expect(page.locator('.workspace-heading-actions').getByRole('link', { name: 'Meu perfil', exact: true })).toBeVisible()
  // 5) No menu lateral, o item da página atual é o mais forte.
  const weight = (name: string) => page.locator('.rep-sidebar nav').getByRole('link', { name, exact: true }).evaluate(element => Number(getComputedStyle(element).fontWeight))
  expect(await weight('Visão geral')).toBeGreaterThan(await weight('Despesas'))
  // 3) Detalhes só para ler: um botão "Fechar", no mesmo formato dos outros secundários, e que recebe o foco.
  await page.route(url => url.pathname === '/api/despesas/d1', route => route.fulfill({ json: { id: 'd1', titulo: 'Internet da casa', categoria: 'Contas da casa', valorTotal: '120.00', vencimento: '2000-01-10T00:00:00Z', criadaEm: '2026-01-01T00:00:00Z', rateios: [] } }))
  await page.goto('/republica/despesas')
  await page.getByRole('button', { name: 'Detalhes de Internet da casa', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Detalhes da despesa', exact: true })
  await expect(dialog.locator('footer button')).toHaveCount(1)
  await expect(dialog.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(dialog).toBeHidden()
  // Nas janelas com ação, "Cancelar" tem o formato dos botões secundários (pílula), não o de link.
  await page.goto('/republica/configuracoes')
  await page.getByRole('button', { name: 'Transferir administração', exact: true }).click()
  const cancel = page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true })
  await expect(cancel).toBeFocused()
  expect(await cancel.evaluate(element => element.classList.contains('rep-logout'))).toBe(false)
})

test('no celular, o tema fica no menu da conta e o topo da página não tem uma linha só para ele', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/republica')
  await expect(page.locator('.workspace-heading-actions .appearance-switch')).toBeHidden()
  await page.getByRole('button', { name: /Abrir menu da conta/ }).click()
  const theme = page.locator('.account-menu-panel').getByRole('switch', { name: 'Modo escuro', exact: true })
  await expect(theme).toBeVisible()
  await theme.press('ArrowRight')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  // O conteúdo começa mais perto do título.
  const heading = (await page.getByRole('heading', { level: 1 }).boundingBox())!, first = (await page.locator('.mode-switch-link').boundingBox())!
  expect(first.y - heading.y).toBeLessThan(150)
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
