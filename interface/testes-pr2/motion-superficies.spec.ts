import { test, expect, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { prepare } from './auxiliares/modernizacao-fixture'

// Instancia HTTP isolada por arquivo; os controles reais permanecem habilitados.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'motion-superficies.spec.ts' } })

const shots = fileURLToPath(new URL('../../.devops-local/interface/imagens/motion-superficies', import.meta.url))
async function ready(page: Page, path = '/republica/despesas') {
  await prepare(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

test('diálogos nativos e compartilhados conservam a modalidade na saída e restauram o foco', async ({ page }) => {
  await ready(page)
  for (const shared of [false, true]) {
    await page.goto(shared ? '/republica/perfil' : '/republica/despesas')
    const trigger = page.getByRole('button', { name: shared ? 'Excluir minha conta' : '＋ Nova despesa', exact: true })
    for (let repetition = 0; repetition < 2; repetition++) {
      await trigger.click()
      const dialog = page.getByRole('dialog')
      expect(await dialog.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0.18s, 0.18s')
      await dialog.evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)) })
      const closing = await dialog.evaluate(element => {
        element.querySelector<HTMLButtonElement>('footer button')!.click()
        const style = getComputedStyle(element)
        return { open: (element as HTMLDialogElement).open, modal: element.matches(':modal'), inert: element.querySelector('form')!.inert,
          duration: style.transitionDuration, target: element.getAttribute('data-motion-state') }
      })
      expect(closing).toEqual({ open: true, modal: true, inert: true, duration: '0.14s', target: 'closing' })
      await expect(dialog).not.toBeVisible()
      await expect(trigger).toBeFocused()
    }
  }
})

test('pagamento lento não fecha nem anuncia sucesso e rejeita reenvio; erro permanece no formulário', async ({ page }) => {
  await ready(page)
  let release!: () => void, attempts = 0, fail = true
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/pagamentos', async route => {
    attempts++
    await gate
    await route.fulfill(fail ? { status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Não foi possível registrar agora. ' + 'Tente novamente. '.repeat(12) } } }
      : { status: 201, json: { id: 'p1' } })
  })
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar pagamento', exact: true })
  await dialog.getByRole('button', { name: 'Registrar pagamento', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Salvando…', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await dialog.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())
  await expect(dialog).toBeVisible()
  await expect(page.locator('.rh-toast')).toHaveCount(0)
  expect(attempts).toBe(1)
  release()
  await expect(dialog.getByRole('alert')).toContainText('Não foi possível registrar agora.')
  await expect(dialog).toBeVisible()
  await expect(page.locator('.rh-toast')).toHaveCount(0)
  fail = false
  await dialog.getByRole('button', { name: 'Registrar pagamento', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.rh-toast')).toContainText('Pagamento registrado.')
  expect(attempts).toBe(2)
})

test('diálogo compartilhado mantém erro e bloqueio durante envio, fechando só após sucesso', async ({ page }) => {
  await ready(page, '/republica/tarefas')
  let release!: () => void, attempts = 0, fail = true
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/tarefas/t1', async route => {
    attempts++
    await gate
    await route.fulfill(fail ? { status: 409, json: { error: { code: 'CONFLICT', message: 'A tarefa mudou. Confira os dados e tente novamente.' } } }
      : { json: { id: 't1', titulo: 'Organizar a cozinha', status: 'ABERTA', responsavelId: 'm1' } })
  })
  await page.getByRole('button', { name: 'Editar tarefa Organizar a cozinha', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar tarefa', exact: true })
  await dialog.getByRole('button', { name: 'Salvar tarefa', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await dialog.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())
  await expect(dialog).toBeVisible()
  expect(attempts).toBe(1)
  release()
  await expect(dialog.getByRole('alert')).toContainText('A tarefa mudou.')
  fail = false
  await dialog.getByRole('button', { name: 'Salvar tarefa', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(attempts).toBe(2)
})

test('teclado e movimento reduzido são imediatos, inclusive ao interromper uma saída', async ({ page }) => {
  await ready(page)
  for (const shared of [false, true]) {
    await page.goto(shared ? '/republica/perfil' : '/republica/despesas')
    const trigger = page.getByRole('button', { name: shared ? 'Excluir minha conta' : '＋ Nova despesa', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    let dialog = page.getByRole('dialog')
    expect(await dialog.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s')
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await expect(dialog).not.toBeVisible()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await trigger.click()
    dialog = page.getByRole('dialog')
    expect(await dialog.evaluate(element => element.getAnimations().length)).toBe(0)
    expect(await dialog.evaluate(element => {
      element.querySelector<HTMLButtonElement>('footer button')!.click()
      return (element as HTMLDialogElement).open
    })).toBe(false)
    await expect(trigger).toBeFocused()
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await trigger.click()
    await dialog.evaluate(element => element.querySelector<HTMLButtonElement>('footer button')!.click())
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  }
})

test('avisos novos interrompem a saída antiga sem perder a mensagem, inclusive com texto idêntico', async ({ page }) => {
  await ready(page)
  // Montagem controlada do componente real para provocar duas confirmações no mesmo quadro.
  // Não cria endpoint, atraso ou controle de demonstração no produto.
  await page.evaluate(async () => {
    const load = (url: string) => import(url)
    const { default: React } = await load('/node_modules/.vite/deps/react.js')
    const { default: ReactDOM } = await load('/node_modules/.vite/deps/react-dom_client.js')
    const { default: SuccessNotice } = await load('/codigo/interno/SuccessNotice.tsx')
    const host = document.createElement('section')
    host.className = 'rep-internal'
    host.dataset.workspaceInput = 'pointer'
    document.body.append(host)
    function Harness() {
      const [notice, setNotice] = React.useState({ id: 'one', message: 'Operação confirmada.', instant: false })
      const dismiss = React.useCallback((id: string) => setNotice((current: { id: string } | null) => current?.id === id ? null : current), [])
      React.useEffect(() => {
        const replace = () => setNotice({ id: 'two', message: 'Operação confirmada.', instant: false })
        window.addEventListener('motion-test-replace', replace)
        return () => window.removeEventListener('motion-test-replace', replace)
      }, [])
      return React.createElement('div', { className: 'rep-status', role: 'status' }, notice && React.createElement(SuccessNotice, { notice, onDismiss: dismiss }))
    }
    ReactDOM.createRoot(host).render(React.createElement(Harness))
  })
  const toast = page.locator('.rh-toast')
  await expect(toast).toContainText('Operação confirmada.')
  await toast.evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)) })
  await page.clock.install()
  await toast.evaluate(element => {
    element.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
  })
  await expect(toast).toHaveAttribute('data-state', 'closed')
  await page.evaluate(() => window.dispatchEvent(new Event('motion-test-replace')))
  await expect(toast).toHaveAttribute('data-state', 'open')
  await toast.evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)) })
  // Avança além de qualquer fallback antigo; sucesso continua até fechamento manual.
  await page.clock.runFor(10_000)
  await expect(toast).toContainText('Operação confirmada.')
  await toast.getByRole('button', { name: 'Fechar aviso', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(toast).toHaveCount(0)
})

test('aviso real tem saída visível e o fechamento possui fallback sem transitionend', async ({ page }) => {
  await ready(page)
  await page.route('**/api/pagamentos', route => route.fulfill({ status: 201, json: { id: 'p1' } }))
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar pagamento', exact: true }).click()
  const toast = page.locator('.rh-toast')
  await expect(toast).toContainText('Pagamento registrado.')
  expect(await toast.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0.18s, 0.18s')
  await toast.evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)) })
  const exit = await toast.evaluate(element => {
    element.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    return element.isConnected
  })
  expect(exit).toBe(true)
  await expect(toast).toHaveAttribute('data-state', 'closed')
  await expect(toast).toHaveCount(0)
  await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await page.addStyleTag({ content: '.rep-dialog { transition: none !important; }' })
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: '＋ Nova despesa', exact: true })).toBeFocused()
})

test('superfícies cabem nos dois temas e no celular, com quadros intermediários de entrada e saída', async ({ page }) => {
  await ready(page)
  await mkdir(shots, { recursive: true })
  for (const width of [320, 390, 768, 1440]) for (const colorScheme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 600 : 844 })
    await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' })
    await page.goto('/republica/despesas')
    await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const bounds = await dialog.boundingBox()
    expect(bounds!.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).scrollIntoViewIfNeeded()
    await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeInViewport()
    await page.screenshot({ path: `${shots}/modal-${colorScheme}-${width}.png` })
    await page.keyboard.press('Escape')
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const frozen = new Date('2026-11-18T12:00:00Z')
  await page.clock.install({ time: frozen })
  await page.clock.pauseAt(new Date(frozen.getTime() + 1000))
  await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const capture = await dialog.evaluate(async element => {
    await Promise.all(element.getAnimations().map(animation => animation.finished))
    element.querySelector<HTMLButtonElement>('footer button')!.click()
    const animation = element.getAnimations().find(item => (item.effect as KeyframeEffect).target === element)
    if (!animation) throw new Error('Saída não criou uma transição observável')
    for (const item of element.getAnimations()) { item.pause(); item.currentTime = 20 }
    const style = getComputedStyle(element)
    return { opacity: Number(style.opacity), transform: style.transform }
  })
  expect(capture.opacity).toBeGreaterThan(0)
  expect(capture.opacity).toBeLessThan(1)
  await page.screenshot({ path: `${shots}/saida-intermediaria-dark-390.png` })
  expect(await dialog.evaluate(element => (element as HTMLDialogElement).open)).toBe(true)
  await page.clock.runFor(250)
  await expect(dialog).not.toBeVisible()
})
