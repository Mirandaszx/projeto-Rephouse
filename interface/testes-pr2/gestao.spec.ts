import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import pg from 'pg'
import type { components } from '../../integracao/api'

type Schemas = components['schemas']
type Session = { token: string; id: string; email: string }
// A jornada acompanha a mesma conta: administrador, transferência, troca e saída.
// Instancia HTTP isolada por arquivo; os controles reais permanecem habilitados.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'gestao.spec.ts' } })

test.describe.configure({ mode: 'serial' })
let accounts: Record<string, Session>
let house: Schemas['Republica'], otherHouse: Schemas['Republica']
let member: Schemas['Membro'], removed: Schemas['Membro']
let expense: Schemas['Despesa'], paidExpense: Schemas['Despesa'], task: Schemas['Tarefa']
let payment: Schemas['Pagamento']
let ownerMemberId = ''
const api = 'http://127.0.0.1:3405/api'
const password = 'Senha-interface-teste-2026'
const proof = Buffer.from('%PDF-1.4\ncomprovante da jornada de gestao\n%%EOF')
const headers = (who: string) => ({ Authorization: `Bearer ${accounts[who].token}` })
async function send<T>(request: APIRequestContext, method: string, path: string, who: string, data?: unknown): Promise<T> {
  const result = await request.fetch(api + path, { method, headers: headers(who), data })
  expect(result.ok(), `${method} ${path}: ${await result.text()}`).toBe(true)
  return result.status() === 204 ? undefined as T : await result.json() as T
}
async function enter(page: Page, who: string, path: string) {
  await page.goto('/login')
  await page.evaluate(token => sessionStorage.setItem('rephouse-token', token), accounts[who].token)
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}
async function persisted(sql: string, parameters: unknown[]) {
  const metadata = JSON.parse(await readFile('../.devops-local/interface/ambiente.json', 'utf8')) as { schema: string }
  const url = process.env.TEST_DATABASE_URL || 'postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test'
  if (new URL(url).pathname !== '/rabbu_mvp_test' || !/^integration_test_[a-f0-9]+$/.test(metadata.schema) || !sql.startsWith('SELECT ')) throw new Error('Consulta limitada ao banco dedicado')
  const client = new pg.Client({ connectionString: url, options: `-c search_path=${metadata.schema} -c default_transaction_read_only=on` })
  await client.connect()
  try { return (await client.query(sql, parameters)).rows } finally { await client.end() }
}
test.beforeAll(async ({ request }) => {
  accounts = JSON.parse(await readFile('../.devops-local/interface/gestao-contas.json', 'utf8')) as Record<string, Session>
  house = await send(request, 'POST', '/republicas', 'admin', { nome: 'Casa Gestão A' })
  otherHouse = await send(request, 'POST', '/republicas', 'outra-casa', { nome: 'Casa Gestão B' })
  member = await send(request, 'POST', '/republicas/entrar', 'morador', { codigoEntrada: house.codigoEntrada })
  removed = await send(request, 'POST', '/republicas/entrar', 'removido', { codigoEntrada: house.codigoEntrada })
  const owner = await send<Schemas['MinhaConta']>(request, 'GET', '/me', 'admin')
  ownerMemberId = owner.membro!.id
  expense = await send(request, 'POST', '/despesas', 'admin', { titulo: 'Despesa editável', categoria: 'Casa', valorTotal: '60.00', vencimento: '2030-03-10', membroIds: [member.id] })
  paidExpense = await send(request, 'POST', '/despesas', 'admin', { titulo: 'Despesa com histórico', categoria: 'Casa', valorTotal: '40.00', vencimento: '2030-03-10', membroIds: [owner.membro!.id] })
  const response = await request.post(api + '/pagamentos', { headers: { ...headers('admin'), 'Idempotency-Key': randomUUID() }, multipart: { rateioId: paidExpense.rateios[0].id, valor: '10.00', comprovante: { name: 'arquivo.pdf', mimeType: 'application/pdf', buffer: proof } } })
  expect(response.status()).toBe(201); payment = await response.json() as Schemas['Pagamento']
  task = await send(request, 'POST', '/tarefas', 'admin', { titulo: 'Tarefa para editar', responsavelId: member.id })
})

test('perfil salva nome; confirmação incorreta não encerra a sessão e exclusão respeita administração', async ({ page, request }) => {
  await enter(page, 'admin', '/republica/perfil')
  await page.getByLabel('Nome', { exact: true }).fill('Administrador da gestão')
  await page.getByRole('button', { name: 'Salvar nome', exact: true }).click()
  await expect(page.getByText('Nome atualizado.', { exact: true })).toBeVisible()
  expect((await persisted('SELECT nome FROM usuarios WHERE id=$1', [accounts.admin.id]))[0].nome).toBe('Administrador da gestão')
  await page.getByRole('button', { name: 'Excluir minha conta', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Confirmar exclusão da conta' })
  await dialog.getByLabel('Senha atual').fill('Senha-errada-2026')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Excluir conta definitivamente', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Confirme sua senha')
  await expect(page).toHaveURL(/\/republica\/perfil$/)
  expect((await request.get(api + '/me', { headers: headers('admin') })).status()).toBe(200)
  await dialog.getByLabel('Senha atual').fill(password)
  await dialog.getByRole('button', { name: 'Excluir conta definitivamente', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Transfira a administração')
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  expect((await persisted('SELECT ativo, excluido_em FROM usuarios WHERE id=$1', [accounts.admin.id]))[0]).toMatchObject({ ativo: true, excluido_em: null })
})

test('exclusão confirmada retorna 204, preserva registro lógico e revoga acesso', async ({ page, request }) => {
  await enter(page, 'excluir', '/republica/perfil')
  await page.getByRole('button', { name: 'Excluir minha conta', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Senha atual').fill(password)
  await dialog.getByRole('checkbox').check()
  const response = page.waitForResponse(result => result.request().method() === 'DELETE' && result.url().endsWith('/api/me'))
  await dialog.getByRole('button', { name: 'Excluir conta definitivamente', exact: true }).click()
  expect((await response).status()).toBe(204)
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('rephouse-token'))).toBeNull()
  expect((await request.get(api + '/me', { headers: headers('excluir') })).status()).toBe(401)
  const stored = (await persisted('SELECT ativo, excluido_em FROM usuarios WHERE id=$1', [accounts.excluir.id]))[0]
  expect(stored.ativo).toBe(false); expect(stored.excluido_em).not.toBeNull()
})

test('administrador edita casa, desativa vínculo e consulta inativos sem excluir a conta', async ({ page, request }) => {
  await enter(page, 'admin', '/republica/configuracoes')
  await page.getByLabel('Nome da república', { exact: true }).fill('Casa Gestão Atualizada')
  await page.getByLabel('Endereço opcional', { exact: true }).fill('Rua das Flores, 10')
  await page.getByRole('button', { name: 'Salvar república', exact: true }).click()
  await expect(page.getByText('República atualizada.', { exact: true })).toBeVisible()
  expect((await send<Schemas['Republica']>(request, 'GET', '/republicas/atual', 'admin')).endereco).toBe('Rua das Flores, 10')
  await page.goto('/republica/moradores')
  await page.getByRole('button', { name: 'Desativar vínculo de Gestão removido', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  expect((await persisted('SELECT ativo FROM membros_republica WHERE id=$1', [removed.id]))[0].ativo).toBe(true)
  await page.getByRole('button', { name: 'Desativar vínculo de Gestão removido', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar desativação', exact: true }).click()
  const residents = page.getByRole('region', { name: 'Pessoas da casa', exact: true })
  await expect(residents.getByText('Gestão removido', { exact: true })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Incluir moradores inativos' }).check()
  await expect(residents.getByText('Gestão removido', { exact: true })).toBeVisible()
  await expect(page.getByText('Vínculo inativo', { exact: true })).toBeVisible()
  expect((await persisted('SELECT ativo FROM membros_republica WHERE id=$1', [removed.id]))[0].ativo).toBe(false)
  expect((await persisted('SELECT ativo FROM usuarios WHERE id=$1', [accounts.removido.id]))[0].ativo).toBe(true)
})

test('despesa permite edição antes de pagamento e protege valor e participantes com histórico', async ({ page, request }) => {
  await enter(page, 'admin', '/republica/despesas')
  await page.getByRole('button', { name: 'Detalhes de Despesa editável', exact: true }).click()
  await page.getByRole('button', { name: 'Editar despesa', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: 'Editar despesa', exact: true })
  await dialog.getByLabel('Descrição', { exact: true }).fill('Despesa revisada')
  await dialog.getByLabel('Valor total (R$)', { exact: true }).fill('75.00')
  await dialog.getByLabel('Vencimento', { exact: true }).fill('2030-04-11')
  await dialog.getByRole('button', { name: 'Salvar despesa', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Detalhes de Despesa revisada', exact: true })).toBeVisible()
  const stored = await send<Schemas['Despesa']>(request, 'GET', `/despesas/${expense.id}`, 'admin')
  expect(stored.valorTotal).toBe('75.00'); expect(stored.rateios[0].valorDevido).toBe('75.00')
  await page.getByRole('button', { name: 'Detalhes de Despesa com histórico', exact: true }).click()
  await page.getByRole('button', { name: 'Editar despesa', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Editar despesa', exact: true })
  await expect(dialog.getByLabel('Valor total (R$)', { exact: true })).toBeDisabled()
  await expect(dialog.getByText('Já existem pagamentos.', { exact: false })).toBeVisible()
  await dialog.getByLabel('Categoria', { exact: true }).fill('Internet')
  await dialog.getByRole('button', { name: 'Salvar despesa', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect((await persisted('SELECT valor_total::text FROM despesas WHERE id=$1', [paidExpense.id]))[0].valor_total).toBe('40.00')
  expect((await request.patch(api + `/despesas/${paidExpense.id}`, { headers: headers('admin'), data: { valorTotal: '50.00' } })).status()).toBe(409)
})

test('administrador edita tarefa; morador não recebe controles de gestão ou dados de outra casa', async ({ page, request }) => {
  await enter(page, 'admin', '/republica/tarefas')
  await page.getByRole('button', { name: 'Editar tarefa Tarefa para editar', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar tarefa', exact: true })
  await dialog.getByLabel('Título', { exact: true }).fill('Organizar despensa')
  await dialog.getByLabel('Responsável', { exact: true }).selectOption(ownerMemberId)
  await dialog.getByLabel('Prazo opcional', { exact: true }).fill('2030-05-14')
  await dialog.getByLabel('Descrição opcional', { exact: true }).fill('Separar alimentos por validade.')
  await dialog.getByRole('button', { name: 'Salvar tarefa', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Organizar despensa', exact: true })).toBeVisible()
  expect((await persisted('SELECT titulo, prazo::text, responsavel_id FROM tarefas WHERE id=$1', [task.id]))[0]).toMatchObject({ titulo: 'Organizar despensa', prazo: '2030-05-14', responsavel_id: ownerMemberId })
  await enter(page, 'morador', '/republica/tarefas')
  await expect(page.getByRole('button', { name: /^Editar tarefa / })).toHaveCount(0)
  expect((await request.patch(api + `/tarefas/${task.id}`, { headers: headers('morador'), data: { titulo: 'Indevido' } })).status()).toBe(403)
  expect((await request.get(api + `/despesas/${expense.id}`, { headers: headers('outra-casa') })).status()).toBe(404)
  expect((await request.get(api + `/pagamentos/${payment.id}/comprovante`, { headers: headers('morador') })).status()).toBe(404)
})

test('transferência atualiza perfil e revoga a gestão do administrador antigo', async ({ page, request }) => {
  await enter(page, 'admin', '/republica/configuracoes')
  await page.getByRole('button', { name: 'Transferir administração', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Novo administrador', { exact: true }).selectOption(member.id)
  await dialog.getByRole('button', { name: 'Confirmar transferência', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Salvar república', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Transferir administração', exact: true })).toHaveCount(0)
  expect((await send<Schemas['MinhaConta']>(request, 'GET', '/me', 'admin')).tipoUsuario).toBe('USUARIO_NORMAL')
  expect((await send<Schemas['MinhaConta']>(request, 'GET', '/me', 'morador')).tipoUsuario).toBe('USUARIO_ADMIN')
  expect((await request.patch(api + '/republicas/atual', { headers: headers('admin'), data: { nome: 'Indevido' } })).status()).toBe(403)
  expect((await persisted('SELECT admin_id FROM republicas WHERE id=$1', [house.id]))[0].admin_id).toBe(accounts.morador.id)
})

test('troca inválida preserva vínculo; troca válida mantém histórico e download idêntico', async ({ page, request }) => {
  await enter(page, 'admin', '/republica/configuracoes')
  await page.getByRole('button', { name: 'Trocar de república', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Código da nova república').fill('INVALIDO123')
  await dialog.getByRole('button', { name: 'Confirmar troca', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Código de entrada inválido')
  expect((await send<Schemas['MinhaConta']>(request, 'GET', '/me', 'admin')).membro?.republicaId).toBe(house.id)
  await dialog.getByLabel('Código da nova república').fill(otherHouse.codigoEntrada)
  await dialog.getByRole('button', { name: 'Confirmar troca', exact: true }).click()
  await expect(page).toHaveURL(/\/republica$/)
  await page.goto('/republica/financeiro')
  await expect(page.getByRole('heading', { name: 'Despesa com histórico', exact: true })).toBeVisible()
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: /^Baixar comprovante de / }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe('comprovante.pdf')
  const content = await readFile((await download.path())!)
  expect(createHash('sha256').update(content).digest('hex')).toBe(createHash('sha256').update(proof).digest('hex'))
  expect((await send<Schemas['MinhaConta']>(request, 'GET', '/me', 'admin')).membro?.republicaId).toBe(otherHouse.id)
})

test('exclusão com dívida é recusada e pagamento do histórico continua disponível fora da casa de origem', async ({ page, request }) => {
  await enter(page, 'admin', '/republica/perfil')
  await page.getByRole('button', { name: 'Excluir minha conta', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Senha atual').fill(password)
  await dialog.getByRole('checkbox').check()
  const deletion = page.waitForResponse(result => result.url().endsWith('/api/me') && result.request().method() === 'DELETE')
  await dialog.getByRole('button', { name: 'Excluir conta definitivamente', exact: true }).click()
  expect((await deletion).status()).toBe(409)
  await expect(dialog.getByRole('alert')).toContainText('Quite suas dívidas')
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.goto('/republica/financeiro')
  await page.getByRole('button', { name: 'Registrar pagamento desta parte', exact: true }).click()
  dialog = page.getByRole('dialog')
  const response = page.waitForResponse(result => result.url().endsWith('/api/pagamentos') && result.request().method() === 'POST')
  await dialog.getByRole('button', { name: 'Registrar pagamento', exact: true }).click()
  expect((await response).status()).toBe(201)
  await expect(dialog).toHaveCount(0)
  const shares = await send<{ dados: Schemas['RateioPessoal'][] }>(request, 'GET', '/me/financeiro', 'admin')
  expect(shares.dados[0].valorPago).toBe('40.00'); expect(shares.dados[0].pagamentos).toHaveLength(2)
})

test('saída encerra somente vínculo e mantém acesso ao perfil e histórico sem república', async ({ page, request }) => {
  await enter(page, 'admin', '/republica/configuracoes')
  await page.getByRole('button', { name: 'Sair da república', exact: true }).click()
  const response = page.waitForResponse(result => result.url().endsWith('/api/republicas/sair'))
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar saída', exact: true }).click()
  expect((await response).status()).toBe(204)
  await expect(page.getByRole('button', { name: 'Entrar na república', exact: true })).toBeVisible()
  expect((await send<Schemas['MinhaConta']>(request, 'GET', '/me', 'admin')).membro).toBeNull()
  await page.getByRole('link', { name: 'Meu financeiro', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Despesa com histórico', exact: true })).toBeVisible()
  expect((await persisted('SELECT count(*)::int AS total FROM membros_republica WHERE usuario_id=$1 AND ativo', [accounts.admin.id]))[0].total).toBe(0)
})

test('MASTER bloqueia e desbloqueia contas e repúblicas com confirmação; outros perfis recebem 403', async ({ page, request }) => {
  await enter(page, 'master', '/admin')
  await page.getByRole('button', { name: 'Usuários', exact: true }).first().click()
  await page.getByRole('searchbox', { name: 'Buscar usuários', exact: true }).fill(accounts.admin.email)
  await page.getByRole('button', { name: 'Bloquear Administrador da gestão', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar bloqueio', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Desbloquear Administrador da gestão', exact: true })).toBeVisible()
  expect((await request.get(api + '/me', { headers: headers('admin') })).status()).toBe(401)
  await page.getByRole('button', { name: 'Desbloquear Administrador da gestão', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar desbloqueio', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bloquear Administrador da gestão', exact: true })).toBeVisible()
  expect((await persisted('SELECT ativo FROM usuarios WHERE id=$1', [accounts.admin.id]))[0].ativo).toBe(true)
  await page.getByRole('button', { name: 'Repúblicas', exact: true }).first().click()
  await page.getByRole('searchbox', { name: 'Buscar repúblicas', exact: true }).fill('Casa Gestão B')
  await page.getByRole('button', { name: 'Bloquear Casa Gestão B', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar bloqueio', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Desbloquear Casa Gestão B', exact: true })).toBeVisible()
  expect((await request.get(api + '/republicas/atual', { headers: headers('outra-casa') })).status()).toBe(403)
  await page.getByRole('button', { name: 'Desbloquear Casa Gestão B', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar desbloqueio', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bloquear Casa Gestão B', exact: true })).toBeVisible()
  expect((await request.patch(api + `/master/republicas/${otherHouse.id}/status`, { headers: headers('morador'), data: { ativa: false } })).status()).toBe(403)
})

test('novas páginas e modais cabem nos temas claro e escuro; envio duplicado é bloqueado', async ({ page }) => {
  test.setTimeout(120000)
  const captures = '../.devops-local/interface/imagens/gestao'
  await mkdir(captures, { recursive: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await enter(page, 'morador', '/republica')
  for (const theme of ['light', 'dark']) {
    await page.getByRole('switch', { name: 'Modo escuro', exact: true }).press(theme === 'dark' ? 'ArrowRight' : 'ArrowLeft')
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/republica/perfil', '/republica/financeiro', '/republica/configuracoes', '/republica/moradores']) {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} ${theme} ${width}`).toBe(true)
        if (path.endsWith('/financeiro')) await expect(page.getByRole('heading', { name: 'Despesa revisada', exact: true })).toBeVisible()
        if (path.endsWith('/configuracoes')) {
          await page.getByRole('button', { name: 'Sair da república', exact: true }).click()
          await expect(page.getByRole('dialog')).toBeVisible()
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
          await page.keyboard.press('Escape')
          await expect(page.getByRole('dialog')).toHaveCount(0)
        }
        await page.screenshot({ path: `${captures}/${path.split('/').pop()}-${theme}-${width}.png`, fullPage: true })
      }
    }
  }
  await enter(page, 'master', '/admin')
  for (const theme of ['light', 'dark']) {
    await page.getByRole('switch', { name: 'Modo escuro', exact: true }).press(theme === 'dark' ? 'ArrowRight' : 'ArrowLeft')
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await expect(page.getByRole('button', { name: /^Bloquear / }).first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `MASTER ${theme} ${width}`).toBe(true)
      await page.screenshot({ path: `${captures}/master-${theme}-${width}.png`, fullPage: true })
    }
  }
  await enter(page, 'morador', '/republica/perfil')
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  let submissions = 0
  await page.route('**/api/me', async route => {
    if (route.request().method() !== 'PATCH') return route.continue()
    submissions++; await pending; await route.continue()
  })
  await page.getByLabel('Nome', { exact: true }).fill('Gestão morador atualizado')
  const save = page.getByRole('button', { name: 'Salvar nome', exact: true })
  await save.click()
  await expect(page.getByLabel('Nome', { exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Salvando…', exact: true })).toBeDisabled()
  expect(submissions).toBe(1)
  release()
  await expect(page.getByText('Nome atualizado.', { exact: true })).toBeVisible()
})
