import { test, expect } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { prepare } from './auxiliares/modernizacao-fixture'
import { contrast } from './auxiliares/contraste'

test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'tema-cabecalho.spec.ts' } })

test('Claro e Escuro ficam à esquerda do sino, sem repetir o controle na lateral ou no celular', async ({ page }) => {
  test.setTimeout(60000)
  await prepare(page)
  await page.route('**/api/notificacoes/nao-lidas', route => route.fulfill({ json: { tarefas: 0, despesas: 0, gerais: 0, total: 0 } }))
  await page.route('**/api/notificacoes/eventos', route => route.fulfill({ contentType: 'text/event-stream', body: 'event: conectado\ndata: {}\n\n' }))
  const folder = '../.devops-local/interface/imagens/tema-capsula-2026-11-21'
  await mkdir(folder, { recursive: true })
  for (const colorScheme of ['light', 'dark'] as const) for (const width of [320,390,768,1440]) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' }); await page.setViewportSize({ width, height: 900 })
    await page.goto('/republica')
    const mobile = width < 720
    const actions = page.locator('.workspace-heading-actions')
    // Abre pelo teclado: é quem depende do contorno de foco conferido abaixo.
    if (mobile) { await page.getByRole('button', { name: /Abrir menu da conta/ }).focus(); await page.keyboard.press('Enter') }
    const control = (mobile ? page.locator('.account-menu-panel') : actions).locator('.appearance-switch')
    const select = page.getByRole('switch', { name: 'Modo escuro', exact: true })
    const bell = page.getByRole('button', { name: /Notificações/i })
    await expect(select).toHaveCount(1); await expect(select).toHaveAttribute('aria-checked', String(colorScheme === 'dark'))
    await expect(page.getByRole('combobox', { name: 'Aparência', exact: true })).toHaveCount(0)
    await expect(page.locator('.rep-sidebar .appearance-switch, .rep-mobile-actions .appearance-switch')).toHaveCount(0)
    if (mobile) await expect(actions.locator('.appearance-switch')).toBeHidden()
    await expect(bell).toBeVisible()
    const themeBounds = (await control.boundingBox())!, bellBounds = (await bell.boundingBox())!
    expect(themeBounds.width).toBeGreaterThanOrEqual(44); expect(themeBounds.height).toBeGreaterThanOrEqual(44)
    if (!mobile) expect(bellBounds.x - themeBounds.x - themeBounds.width).toBeGreaterThanOrEqual(12)
    expect(await contrast(control.locator('[data-active=true]'))).toBeGreaterThanOrEqual(4.5)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await select.focus(); await expect(select).toBeFocused()
    expect(await control.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none')
    await page.screenshot({ path: `${folder}/tema-${colorScheme}-${width}.png`, fullPage: true })
  }
})

test('escolha manual persiste, sincroniza entre abas e funciona por teclado na sessão real', async ({ page, context, request }) => {
  const accounts = JSON.parse(await readFile('../.devops-local/interface/gestao-contas.json', 'utf8')) as Record<string, { token: string }>
  const token = accounts['tema-admin'].token
  expect((await request.post('http://127.0.0.1:3405/api/republicas', { headers: { Authorization: `Bearer ${token}` }, data: { nome: 'Casa Tema Manual' } })).status()).toBe(201)
  await page.goto('/login'); await page.evaluate(token => sessionStorage.setItem('rephouse-token', token), token)
  await page.goto('/republica')
  const select = page.getByRole('switch', { name: 'Modo escuro', exact: true })
  await select.press('ArrowRight'); await page.reload()
  await expect(select).toBeChecked(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const second = await context.newPage()
  try {
    await second.goto('/login'); await second.evaluate(token => sessionStorage.setItem('rephouse-token', token), token)
    await second.goto('/republica')
    await expect(second.getByRole('switch', { name: 'Modo escuro', exact: true })).toBeChecked()
    await select.press('ArrowLeft')
    await expect(second.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(second.getByRole('switch', { name: 'Modo escuro', exact: true })).not.toBeChecked()
    await select.focus(); await page.keyboard.press('Space')
    await expect(select).toBeChecked(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.goto('/republica/perfil')
    await expect(page.getByRole('switch', { name: 'Modo escuro', exact: true })).toHaveCount(1)
    const themeBounds = (await page.locator('.appearance-switch').boundingBox())!
    const bellBounds = (await page.getByRole('button', { name: /Notificações/i }).boundingBox())!
    expect(bellBounds.x).toBeGreaterThanOrEqual(themeBounds.x + themeBounds.width)
  } finally { await second.close() }
})

test('preferência antiga Sistema exibe o tema efetivo até uma escolha manual, sem terceira opção', async ({ page }) => {
  await prepare(page)
  await page.emulateMedia({ colorScheme: 'dark' }); await page.goto('/republica')
  const select = page.getByRole('switch', { name: 'Modo escuro', exact: true })
  await expect(select).toBeChecked(); await expect(page.getByRole('combobox', { name: 'Aparência', exact: true })).toHaveCount(0)
  await page.emulateMedia({ colorScheme: 'light' }); await expect(select).not.toBeChecked()
  await select.press('ArrowRight')
  await page.emulateMedia({ colorScheme: 'dark' }); await page.emulateMedia({ colorScheme: 'light' })
  await expect(select).toBeChecked(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('MASTER também oferece somente Claro e Escuro no cabeçalho', async ({ page }) => {
  await prepare(page, { master: true })
  await page.goto('/republica')
  await expect(page.getByRole('heading', { name: 'Visão da plataforma', exact: true })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Modo escuro', exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Aparência', exact: true })).toHaveCount(0)
})

test('cápsula responde a cliques e arrasto nos dois sentidos; cancelar mantém a preferência', async ({ page }) => {
  await prepare(page); await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' }); await page.goto('/republica')
  const control = page.getByRole('switch', { name: 'Modo escuro', exact: true })
  const thumb = control.locator('.appearance-switch-thumb')
  const bounds = (await control.boundingBox())!
  await control.click({ position: { x: 78, y: 22 } }); await expect(control).toBeChecked()
  expect(await thumb.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0.22s')
  await expect.poll(() => thumb.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)).toBeGreaterThan(40)
  await control.click({ position: { x: 26, y: 22 } }); await expect(control).not.toBeChecked()
  for (const [from, to, checked] of [[26,78,true],[78,26,false]] as const) {
    await page.mouse.move(bounds.x + from, bounds.y + 22); await page.mouse.down()
    await page.mouse.move(bounds.x + (from + to) / 2, bounds.y + 22, { steps: 4 })
    const x = await thumb.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)
    expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(47)
    await page.mouse.move(bounds.x + to, bounds.y + 22, { steps: 4 }); await page.mouse.up()
    await expect(control).toHaveAttribute('aria-checked', String(checked))
  }
  await page.mouse.move(bounds.x + 26, bounds.y + 22); await page.mouse.down()
  await page.mouse.move(bounds.x + 78, bounds.y + 22, { steps: 4 })
  await control.dispatchEvent('pointercancel'); await page.mouse.up()
  await expect(control).not.toBeChecked(); await expect(control).toHaveAttribute('data-dragging', 'false')
  await control.press('Enter'); await expect(control).toBeChecked()
  expect(await thumb.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await control.click({ position: { x: 26, y: 22 } }); await expect(control).not.toBeChecked()
  expect(await thumb.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s')
})

test('toque troca o tema e mantém foco visível em alto contraste', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 }, colorScheme: 'light' })
  try {
    const page = await context.newPage(); await prepare(page); await page.goto('http://127.0.0.1:5174/republica')
    // No celular o tema fica no menu da conta (desde 25/11/2026).
    const menu = page.getByRole('button', { name: /Abrir menu da conta/ })
    await menu.tap()
    const control = page.getByRole('switch', { name: 'Modo escuro', exact: true })
    const bounds = (await control.boundingBox())!
    await page.touchscreen.tap(bounds.x + 78, bounds.y + 22); await expect(control).toBeChecked()
    await page.touchscreen.tap(bounds.x + 26, bounds.y + 22); await expect(control).not.toBeChecked()
    await page.emulateMedia({ forcedColors: 'active' }); await control.press('Tab'); await control.focus()
    expect(await control.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none')
    await expect(control).toBeFocused()
  } finally { await context.close() }
})
