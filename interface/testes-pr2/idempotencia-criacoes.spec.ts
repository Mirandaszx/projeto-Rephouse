import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { readFile, mkdir } from 'node:fs/promises'

// Instancia HTTP isolada por arquivo; os controles reais permanecem habilitados.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'idempotencia-criacoes.spec.ts' } })

const api = 'http://127.0.0.1:3405/api'
for (const kind of ['despesas', 'tarefas'] as const) {
  test(`${kind}: resposta perdida permite reenvio original sem duplicação`, async ({ page, request }) => {
    await page.setViewportSize(kind === 'tarefas' ? { width: 390, height: 844 } : { width: 1440, height: 900 })
    await page.emulateMedia({ colorScheme: kind === 'tarefas' ? 'dark' : 'light', reducedMotion: 'reduce' })
    const accounts = JSON.parse(await readFile('../.devops-local/interface/gestao-contas.json', 'utf8')) as Record<string, { token: string }>
    const { token } = accounts['reenvio-' + kind]
    const headers = { Authorization: `Bearer ${token}` }
    expect((await request.post(api + '/republicas', { headers, data: { nome: 'Casa reenvio' } })).status()).toBe(201)
    await page.goto('/login')
    await page.evaluate(value => sessionStorage.setItem('rephouse-token', value), token)
    await page.goto(`/republica/${kind}`)
    const createName = kind === 'tarefas' ? 'Nova tarefa' : /^(?:\uFF0B )?(?:Nova despesa|Criar primeira despesa)$/
    await page.getByRole('button', { name: createName, exact: true }).first().click()
    const dialog = page.getByRole('dialog', { name: kind === 'tarefas' ? 'Nova tarefa' : 'Nova despesa', exact: true })
    const title = `Operação ${kind} ${randomUUID()}`
    await dialog.getByLabel(kind === 'tarefas' ? 'Título' : 'Descrição', { exact: true }).fill(title)
    if (kind === 'despesas') {
      await dialog.getByLabel('Valor total da despesa (R$)', { exact: true }).fill('100.00')
      await dialog.getByLabel('Vencimento', { exact: true }).fill('2099-01-31')
    } else {
      await dialog.getByRole('combobox', { name: 'Selecionar responsável' }).click()
      await page.getByRole('option', { name: 'Gestão reenvio-' + kind }).click()
    }
    const sent: { key: string | undefined; body: string | null }[] = []
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route(`**/api/${kind}`, async route => {
      if (route.request().method() !== 'POST') return route.continue()
      sent.push({ key: route.request().headers()['idempotency-key'], body: route.request().postData() })
      const response = await route.fetch()
      expect(response.status()).toBe(201)
      if (sent.length === 1) { await gate; await route.abort('connectionfailed') }
      else await route.fulfill({ response })
    })
    await dialog.getByRole('button', { name: kind === 'tarefas' ? 'Criar tarefa' : 'Adicionar', exact: true }).click()
    await expect(dialog.getByRole('button', { name: 'Salvando…', exact: true })).toBeDisabled()
    await page.keyboard.press('Enter')
    await expect.poll(() => sent.length).toBe(1)
    release()
    await expect(dialog.getByText(/Não foi possível confirmar se foi salvo/)).toBeVisible()
    await expect(dialog.getByLabel(kind === 'tarefas' ? 'Título' : 'Descrição', { exact: true })).toBeDisabled()
    await mkdir('../.devops-local/interface/reenvios-2-2-1', { recursive: true })
    await page.screenshot({ path: `../.devops-local/interface/reenvios-2-2-1/${kind}-resultado-incerto.png` })
    await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await page.getByRole('button', { name: createName, exact: true }).first().click()
    await expect(dialog.getByRole('button', { name: 'Reenviar solicitação', exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: 'Reenviar solicitação', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    expect(sent).toHaveLength(2)
    expect(sent[0].key).toMatch(/^[a-f0-9-]{36}$/)
    expect(sent[1]).toEqual(sent[0])
    const rows = await (await request.get(api + '/' + kind, { headers })).json() as { dados: { titulo: string }[] }
    expect(rows.dados.filter(row => row.titulo === title)).toHaveLength(1)
    await page.getByRole('button', { name: createName, exact: true }).first().click()
    await dialog.getByLabel(kind === 'tarefas' ? 'Título' : 'Descrição', { exact: true }).fill(title)
    if (kind === 'despesas') {
      await dialog.getByLabel('Valor total da despesa (R$)', { exact: true }).fill('100.00')
      await dialog.getByLabel('Vencimento', { exact: true }).fill('2099-01-31')
    } else {
      await dialog.getByRole('combobox', { name: 'Selecionar responsável' }).click()
      await page.getByRole('option', { name: 'Gestão reenvio-' + kind }).click()
    }
    await dialog.getByRole('button', { name: kind === 'tarefas' ? 'Criar tarefa' : 'Adicionar', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    expect(sent).toHaveLength(3)
    expect(sent[2].key).not.toBe(sent[0].key)
    const intentional = await (await request.get(api + '/' + kind, { headers })).json() as { dados: { titulo: string }[] }
    expect(intentional.dados.filter(row => row.titulo === title)).toHaveLength(2)
  })
  test(`${kind}: rejeição 400 permite correção sem gravar a tentativa inválida`, async ({ page, request }) => {
    const accounts = JSON.parse(await readFile('../.devops-local/interface/gestao-contas.json', 'utf8')) as Record<string, { token: string }>
    const { token } = accounts['validacao-' + kind]
    const headers = { Authorization: `Bearer ${token}` }
    expect((await request.post(api + '/republicas', { headers, data: { nome: 'Casa validação' } })).status()).toBe(201)
    await page.goto('/login')
    await page.evaluate(value => sessionStorage.setItem('rephouse-token', value), token)
    await page.goto(`/republica/${kind}`)
    await page.getByRole('button', { name: kind === 'tarefas' ? 'Nova tarefa' : /^(?:\uFF0B )?(?:Nova despesa|Criar primeira despesa)$/, exact: true }).first().click()
    const dialog = page.getByRole('dialog', { name: kind === 'tarefas' ? 'Nova tarefa' : 'Nova despesa', exact: true })
    const title = dialog.getByLabel(kind === 'tarefas' ? 'Título' : 'Descrição', { exact: true })
    await title.fill('Criação a corrigir')
    if (kind === 'despesas') {
      await dialog.getByLabel('Valor total da despesa (R$)', { exact: true }).fill('10.00')
      await dialog.getByLabel('Vencimento', { exact: true }).fill('2099-01-31')
    } else {
      await dialog.getByRole('combobox', { name: 'Selecionar responsável' }).click()
      await page.getByRole('option', { name: 'Gestão validacao-' + kind }).click()
    }
    const keys: (string | undefined)[] = []
    await page.route(`**/api/${kind}`, async route => {
      if (route.request().method() !== 'POST') return route.continue()
      keys.push(route.request().headers()['idempotency-key'])
      // Falha de entrada no transporte; a rejeição e o rollback são da API real.
      const response = keys.length === 1 ? await route.fetch({ postData: JSON.stringify({ ...route.request().postDataJSON(), titulo: '' }) }) : await route.fetch()
      expect(response.status()).toBe(keys.length === 1 ? 400 : 201)
      await route.fulfill({ response })
    })
    const submit = dialog.getByRole('button', { name: kind === 'tarefas' ? 'Criar tarefa' : 'Adicionar', exact: true })
    await submit.click()
    await expect(dialog.getByRole('alert')).toContainText('Os dados enviados são inválidos.')
    await expect(title).toBeEnabled()
    const empty = await (await request.get(api + '/' + kind, { headers })).json() as { dados: unknown[] }
    expect(empty.dados).toHaveLength(0)
    await title.fill('Criação corrigida')
    await submit.click()
    await expect(dialog).not.toBeVisible()
    expect(keys).toHaveLength(2)
    expect(keys[1]).not.toBe(keys[0])
  })
}
