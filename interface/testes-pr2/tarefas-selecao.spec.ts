import { test, expect, type Page } from '@playwright/test'
import { prepare } from './auxiliares/modernizacao-fixture'

// Seleção de várias tarefas livres (24/11/2026). A regra de quem pode assumir é a da API, coberta nos testes do backend.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'tarefas-selecao.spec.ts' } })

const task = (id: string, titulo: string, responsavelId: string | null, status = 'ABERTA') =>
  ({ id, titulo, descricao: null, status, prazo: null, responsavelId, responsavelAtivo: responsavelId ? true : null, criadorId: 'outra-pessoa' })

async function open(page: Page, recusar: string[] = []) {
  await prepare(page, { resident: true })
  const tasks = [task('a', 'Lavar a louça', null), task('b', 'Levar o lixo', null), task('c', 'Regar as plantas', null), task('d', 'Limpar a sala', 'm2'), task('e', 'Trocar o filtro', 'm2', 'CONCLUIDA')]
  const pedidos: string[] = []
  await page.route('**/api/notificacoes/nao-lidas', route => route.fulfill({ json: { tarefas: 0, despesas: 0, gerais: 0, total: 0 } }))
  await page.route('**/api/notificacoes/eventos', route => route.fulfill({ contentType: 'text/event-stream', body: 'event: conectado\ndata: {}\n\n' }))
  await page.route('**/api/tarefas', route => route.fulfill({ json: tasks }))
  await page.route('**/api/tarefas/*/assumir', route => {
    const id = new URL(route.request().url()).pathname.split('/').at(-2)!
    pedidos.push(id)
    if (recusar.includes(id)) return route.fulfill({ status: 409, json: { error: { code: 'TASK_ALREADY_ASSIGNED', message: 'Outro morador já assumiu esta tarefa.' } } })
    const alvo = tasks.find(item => item.id === id)!
    alvo.responsavelId = 'm1'; alvo.responsavelAtivo = true
    return route.fulfill({ json: alvo })
  })
  await page.goto('/republica/tarefas')
  await expect(page.locator('.rep-task-row')).toHaveCount(5)
  return pedidos
}

test('morador marca várias tarefas livres e assume todas de uma vez', async ({ page }) => {
  const pedidos = await open(page)
  const assumir = page.getByRole('button', { name: /^Assumir selecionadas/ })
  await expect(assumir).toHaveCount(0)
  await page.getByText('Lavar a louça', { exact: true }).click()
  await page.getByRole('checkbox', { name: 'Selecionar tarefa Levar o lixo', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByText('2 tarefas selecionadas', { exact: true })).toBeVisible()
  // Selecionar não é concluir: o título não aparece riscado e nada foi enviado ainda.
  await expect(page.locator('.rep-task-name-done')).toHaveCount(1)
  expect(pedidos).toEqual([])
  await assumir.click()
  await expect(page.getByText('Você assumiu 2 tarefas.', { exact: true })).toBeVisible()
  expect(pedidos).toEqual(['a', 'b'])
  await expect(assumir).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Assumir tarefa Regar as plantas', exact: true })).toBeVisible()
})

test('a caixa existe só nas tarefas livres; as demais não têm nada que conclua sem querer', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('checkbox')).toHaveCount(3)
  const alheia = page.locator('.rep-task-row').filter({ hasText: 'Limpar a sala' })
  await expect(alheia.getByRole('checkbox')).toHaveCount(0)
  // Morador não conclui a tarefa de outra pessoa.
  await expect(alheia.getByRole('button', { name: /^Concluir tarefa / })).toHaveCount(0)
})

test('concluir e reabrir são botões; tocar no nome da tarefa não muda nada', async ({ page }) => {
  await open(page)
  const mudancas: string[] = []
  await page.route('**/api/tarefas/m', route => {
    const status = route.request().postDataJSON().status
    mudancas.push(status)
    return route.fulfill({ json: { ...task('m', 'Varrer o quintal', 'm1', status) } })
  })
  await page.route('**/api/tarefas', route => route.fulfill({ json: [task('m', 'Varrer o quintal', 'm1')] }))
  await page.reload()
  await page.getByText('Varrer o quintal', { exact: true }).click()
  expect(mudancas).toEqual([])
  await page.getByRole('button', { name: 'Concluir tarefa Varrer o quintal', exact: true }).click()
  await expect(page.getByText('Tarefa concluída.', { exact: true })).toBeVisible()
  await expect(page.locator('.rep-task-name-done')).toHaveText('Varrer o quintal')
  await page.getByRole('button', { name: 'Reabrir tarefa Varrer o quintal', exact: true }).click()
  await expect(page.getByText('Tarefa reaberta.', { exact: true })).toBeVisible()
  expect(mudancas).toEqual(['CONCLUIDA', 'ABERTA'])
})

test('se outro morador assumir antes, avisa quantas entraram e quantas não', async ({ page }) => {
  await open(page, ['b'])
  for (const titulo of ['Lavar a louça', 'Levar o lixo']) await page.getByText(titulo, { exact: true }).click()
  await page.getByRole('button', { name: /^Assumir selecionadas/ }).click()
  await expect(page.getByText('Você assumiu 1 tarefa.', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('1 tarefa não pôde ser assumida')
})
