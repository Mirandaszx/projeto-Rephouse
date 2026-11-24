import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { prepare } from './auxiliares/modernizacao-fixture'
import { contrast } from './auxiliares/contraste'

test('visão geral troca a criação por perfil acessível ao lado do sino nos dois temas', async ({ page }) => {
  test.setTimeout(60000)
  await prepare(page)
  // Esta é uma conferência visual; a jornada com sessão real está em painel.spec.ts.
  await page.route('**/api/notificacoes/nao-lidas', route => route.fulfill({ json: { tarefas: 0, despesas: 0, gerais: 0, total: 0 } }))
  await page.route('**/api/notificacoes/eventos', route => route.fulfill({ contentType: 'text/event-stream', body: 'event: conectado\ndata: {}\n\n' }))
  const folder = '../.devops-local/interface/imagens/perfil-cabecalho-2026-11-21'
  await mkdir(folder, { recursive: true })
  for (const colorScheme of ['light', 'dark'] as const) for (const width of [320, 390, 768, 1440]) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/republica')
    const actions = page.locator('.workspace-heading-actions')
    // Redesign de 24/11/2026: no celular (< 720 px) o avatar não se repete no cabeçalho; o acesso à conta
    // é o botão do menu no topo, que cumpre os mesmos critérios de tamanho, contraste e foco.
    const mobile = width < 720
    const profile = mobile ? page.getByRole('button', { name: /Abrir menu da conta/ }) : actions.getByRole('link', { name: 'Meu perfil', exact: true })
    const bell = actions.getByRole('button', { name: /Notificações/i })
    await expect(profile).toBeVisible(); await expect(bell).toBeVisible()
    await expect(actions.getByRole('button', { name: '＋ Nova despesa', exact: true })).toHaveCount(0)
    if (!mobile) await expect(profile).toHaveAttribute('href', '/republica/perfil')
    const profileBounds = (await profile.boundingBox())!, bellBounds = (await bell.boundingBox())!
    expect(profileBounds.width).toBeGreaterThanOrEqual(44); expect(profileBounds.height).toBeGreaterThanOrEqual(44)
    if (!mobile) expect(profileBounds.x - bellBounds.x - bellBounds.width).toBeGreaterThanOrEqual(12)
    expect(await contrast(profile)).toBeGreaterThanOrEqual(4.5)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await profile.focus(); await expect(profile).toBeFocused()
    expect(await profile.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none')
    await page.screenshot({ path: `${folder}/perfil-${colorScheme}-${width}.png`, fullPage: true })
    await page.keyboard.press('Enter')
    // No celular, Enter abre o menu e o perfil fica a um toque.
    if (mobile) await page.getByRole('navigation', { name: 'Sua conta' }).getByRole('link', { name: 'Meu perfil', exact: true }).click()
    await expect(page).toHaveURL(/\/republica\/perfil$/)
    await expect(page.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible()
  }
})

test('morador também acessa o próprio perfil e, desde 24/11/2026, também cadastra despesas', async ({ page }) => {
  await prepare(page, { resident: true })
  await page.goto('/republica')
  await page.locator('.workspace-heading-actions').getByRole('link', { name: 'Meu perfil', exact: true }).click()
  await expect(page).toHaveURL(/\/republica\/perfil$/)
  await page.goto('/republica/despesas')
  await expect(page.getByRole('button', { name: '＋ Nova despesa', exact: true })).toBeVisible()
})
