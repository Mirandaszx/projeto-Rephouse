import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { prepare, type Fixture } from './auxiliares/modernizacao-fixture'
import { contrast } from './auxiliares/contraste'

const shots = fileURLToPath(new URL('../../.devops-local/interface/imagens/escuro-fluidez', import.meta.url))

// Instancia HTTP isolada por arquivo; os controles reais permanecem habilitados.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'escuro-fluidez.spec.ts' } })

test('tema escuro mantém painéis acabados e estados vazios sem casinhas repetidas', async ({ page }) => {
  const fixture: Fixture = { empty: true }
  await prepare(page, fixture)
  await mkdir(shots, { recursive: true })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/republica')
    await expect(page.getByRole('heading', { name: 'Comece pela primeira despesa.', exact: true })).toBeVisible()
    await expect(page.locator('.rep-metric')).toHaveCount(4)
    await expect(page.locator('.rep-overview-panel')).toHaveCount(2)
    await expect(page.locator('.workspace-heading-actions').getByRole('link', { name: 'Meu perfil', exact: true })).toBeVisible()
    await expect(page.locator('.workspace-heading-actions').getByRole('button', { name: '＋ Nova despesa', exact: true })).toHaveCount(0)
    await expect(page.locator('.workspace-empty svg')).toHaveCount(0)
    for (const target of await page.locator('.rep-overview-panel :is(h2, h3, p, a)').all()) {
      expect(await contrast(target)).toBeGreaterThanOrEqual(4.5)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `${shots}/resumo-vazio-dark-${width}.png`, fullPage: true })
  }
  for (const path of ['/republica/despesas', '/republica/tarefas', '/republica/financeiro']) {
    await page.goto(path)
    await expect(page.locator('.workspace-empty')).not.toHaveCount(0)
    await expect(page.locator('.workspace-empty svg')).toHaveCount(0)
  }
  fixture.empty = false
  await page.goto('/republica')
  await expect(page.locator('.rep-pending-tasks li')).toHaveCount(1)
  const canvas = await page.locator('.republica').evaluate(element => getComputedStyle(element).backgroundColor)
  for (const panel of await page.locator('.rep-overview-panel').all()) {
    const style = await panel.evaluate(element => {
      const css = getComputedStyle(element)
      return { background: css.backgroundColor, radius: parseFloat(css.borderRadius), padding: parseFloat(css.paddingLeft), border: css.borderTopWidth }
    })
    expect(style.background).not.toBe(canvas)
    expect(style.radius).toBeGreaterThanOrEqual(14)
    expect(style.padding).toBeGreaterThanOrEqual(16)
    expect(style.border).toBe('1px')
  }
  for (const metric of await page.locator('.rep-metric-strip .rep-metric').all()) expect(await metric.evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  await page.screenshot({ path: `${shots}/resumo-preenchido-dark-1440.png`, fullPage: true })
})

test('orientação inicial abre o formulário e não esconde valores, falhas ou carregamento', async ({ page }) => {
  const fixture: Fixture = { empty: true }
  await prepare(page, fixture)
  await page.goto('/republica')
  await page.getByRole('button', { name: 'Registrar primeira despesa', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Nova despesa', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  fixture.dashboard = { totalPendente: '80.00', totalPagoNoMes: '40.00', tarefasAbertas: 0 }
  await page.reload()
  await expect(page.getByRole('region', { name: 'Resumo da república' })).toContainText('80,00')
  await expect(page.locator('.rep-overview-start')).toHaveCount(0)
  fixture.dashboard = undefined; fixture.taskError = true
  await page.reload()
  await expect(page.getByRole('alert')).toHaveText('Não foi possível carregar as tarefas agora.')
  await expect(page.locator('.rep-overview-start')).toHaveCount(0)
  fixture.taskError = false
  let release!: () => void
  fixture.loading = new Promise<void>(resolve => { release = resolve })
  await page.reload()
  await expect(page.getByText('Carregando tarefas…', { exact: true })).toBeVisible()
  await expect(page.locator('.rep-overview-start')).toHaveCount(0)
  release(); fixture.loading = undefined
  await expect(page.getByRole('heading', { name: 'Comece pela primeira despesa.', exact: true })).toBeVisible()
  fixture.resident = true
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Os registros da casa ficam aqui.', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Registrar primeira despesa', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Ver moradores', exact: true })).toBeVisible()
})

test('filtros interrompem a transição sem atrasar dados, teclado ou movimento reduzido', async ({ page }) => {
  await prepare(page)
  // Desacelera somente esta captura de teste para observar a interrupção sem sleeps.
  await page.addInitScript(() => {
    const animate = Element.prototype.animate
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options)
      if (this.matches('.workspace-results')) animation.playbackRate = .05
      return animation
    }
  })
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'dark' })
  for (const path of ['/republica/despesas', '/republica/tarefas']) {
    // A mesma fixture conserva dados fictícios e não envia alterações ao banco.
    await page.goto(path)
    const tasks = path.endsWith('/tarefas')
    const results = page.locator('.workspace-results').last()
    await expect(page.locator(tasks ? '.rep-task-row' : '.rep-expenses li')).toHaveCount(tasks ? 2 : 1)
    await page.getByRole('radio', { name: tasks ? 'Concluídas' : 'Pagas', exact: true }).click()
    await expect(page.locator(tasks ? '.rep-task-row' : '.rep-expenses li')).toHaveCount(tasks ? 1 : 0)
    expect(await results.evaluate(element => element.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(1)
    await page.getByRole('radio', { name: 'Todas', exact: true }).click()
    await expect(page.locator(tasks ? '.rep-task-row' : '.rep-expenses li')).toHaveCount(tasks ? 2 : 1)
    expect(await results.evaluate(element => element.getAnimations().length)).toBe(1)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(() => results.evaluate(element => element.getAnimations().length)).toBe(0)
    await page.getByRole('radio', { name: tasks ? 'Abertas' : 'Pendentes', exact: true }).click()
    expect(await results.evaluate(element => element.getAnimations().length)).toBe(0)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.getByRole('radio', { name: 'Todas', exact: true }).focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('radio', { name: 'Todas', exact: true })).toBeChecked()
    expect(await results.evaluate(element => element.getAnimations().length)).toBe(0)
  }
})

test('MASTER e diálogos mantêm feedback curto e acesso imediato por teclado', async ({ page }) => {
  await prepare(page, { master: true })
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'dark' })
  await page.goto('/admin')
  const trigger = page.getByRole('button', { name: 'Filtrar por status — abrir opções', exact: true })
  await trigger.click()
  const popup = page.locator('.rep-combobox-popup')
  await expect(popup).toBeVisible()
  expect(await popup.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0.15s, 0.15s')
  await page.keyboard.press('Escape')
  await expect(popup).not.toBeVisible()
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(popup).toBeVisible()
  expect(await popup.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Usuários', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Usuários', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Bloquear Camila Almeida', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Bloquear usuário', exact: true })
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0.18s, 0.18s')
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused()
  expect(await contrast(dialog.getByRole('button', { name: 'Confirmar bloqueio', exact: true }))).toBeGreaterThanOrEqual(4.5)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Bloquear Camila Almeida', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Repúblicas', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Repúblicas', exact: true })).toBeVisible()
  expect(await page.locator('.workspace-results').evaluate(element => element.getAnimations().length)).toBe(0)
})
