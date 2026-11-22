import { test, expect, type Page } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'
import type { components } from '../../integracao/api'
type Schemas = components['schemas']
type Session = { token: string; id: string }
const api = 'http://127.0.0.1:3405/api'
let accounts: Record<string, Session>, house: Schemas['Republica'], expense: Schemas['Despesa'], recurring: Schemas['Recorrencia']
let reference: string, endDate: string
const headers = (who = 'financeiro-admin') => ({ Authorization: `Bearer ${accounts[who].token}` })
// Instancia HTTP isolada por arquivo; os controles reais permanecem habilitados.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'financeiro-evolucao.spec.ts' } })

test.describe.configure({ mode: 'serial' })
test.beforeAll(async ({ request }) => {
  accounts = JSON.parse(await readFile('../.devops-local/interface/gestao-contas.json','utf8'))
  const result = await request.post(api+'/republicas',{headers:headers(),data:{nome:'Casa Financeiro 2.2'}})
  expect(result.status()).toBe(201);house=await result.json()
  expect((await request.post(api+'/republicas/entrar',{headers:headers('financeiro-morador'),data:{codigoEntrada:house.codigoEntrada}})).status()).toBe(201)
  reference=(await (await request.get(api+'/dashboard',{headers:headers()})).json() as Schemas['Painel']).dataReferencia!
})
async function enter(page:Page,path:string,who='financeiro-admin') {
  await page.goto('/login')
  await page.evaluate(value=>sessionStorage.setItem('rephouse-token',value),accounts[who].token)
  await page.goto(path)
  await expect(page.getByRole('heading',{level:1})).toBeVisible()
}
test('primeira despesa recorrente pelo formulário usa a competência e impede envio duplicado',async({page,request})=>{
  await enter(page,'/republica')
  await page.getByRole('button',{name:'Registrar primeira despesa',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Nova despesa'})
  await dialog.getByLabel('Descrição',{exact:true}).fill('Internet mensal da jornada')
  await dialog.getByLabel('Categoria',{exact:true}).fill('Internet')
  await dialog.getByLabel('Valor total da despesa (R$)',{exact:true}).fill('120.00')
  const current=reference.slice(0,7), end=new Date(`${current}-01T12:00:00Z`)
  end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0)
  await dialog.getByLabel('Vencimento',{exact:true}).fill(end.toISOString().slice(0,10))
  await dialog.getByRole('checkbox',{name:'Repetir mensalmente',exact:true}).check()
  await expect(dialog.getByLabel('Primeiro mês de vencimento',{exact:true})).toHaveValue(current)
  const last = new Date(`${current}-01T00:00:00Z`); last.setUTCMonth(last.getUTCMonth() + 3); last.setUTCDate(15)
  endDate = last.toISOString().slice(0, 10)
  await dialog.getByLabel('Repetir até (opcional)', { exact: true }).fill(endDate)
  let release!:()=>void,posts=0
  const gate=new Promise<void>(resolve=>{release=resolve})
  await page.route('**/api/recorrencias',async route=>{if(route.request().method()==='POST'){posts++;await gate}await route.continue()})
  await dialog.getByRole('button',{name:'Adicionar',exact:true}).click()
  await expect(dialog.getByRole('button',{name:'Salvando…',exact:true})).toBeDisabled()
  release()
  await expect(dialog).not.toBeVisible()
  expect(posts).toBe(1)
  await page.unroute('**/api/recorrencias')
  const expenses=await (await request.get(api+'/despesas',{headers:headers()})).json() as {dados:Schemas['Despesa'][]}
  expense=expenses.dados[0];expect(expense.valorTotal).toBe('120.00');expect(expense.recorrencia).not.toBeNull()
  recurring=await (await request.get(api+`/recorrencias/${expense.recorrencia!.id}`,{headers:headers()})).json()
  expect(recurring.fim).toBe(endDate)
  expect(expense.rateios.map(item=>item.valorDevido)).toEqual(['60.00','60.00'])
})
test('pagamento parcial aparece no resumo mensal e filtros da própria parcela',async({page,request})=>{
  await enter(page,'/republica/despesas')
  const row=page.locator('#despesas li').filter({hasText:'Internet mensal da jornada'})
  await expect(row).toContainText('Recorrente')
  await row.getByRole('button',{name:'Registrar pagamento',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Registrar pagamento',exact:true})
  await dialog.getByLabel('Valor pago (R$)',{exact:true}).fill('25.00')
  await dialog.getByRole('button',{name:'Registrar pagamento',exact:true}).click()
  await expect(dialog).not.toBeVisible()
  await expect(row).toContainText('35,00')
  await expect(row).toContainText('Parcial')
  await page.getByRole('combobox',{name:'Valores e filtros',exact:true}).selectOption('PESSOAL')
  await page.getByRole('radio',{name:'Pendentes',exact:true}).click()
  await expect(row).toBeVisible()
  await page.getByRole('link',{name:'Meu financeiro',exact:true}).first().click()
  await page.getByLabel('Mês do vencimento',{exact:true}).fill(reference.slice(0,7))
  const summary=page.getByRole('region',{name:'Resumo do seu financeiro'})
  await expect(summary).toContainText('60,00');await expect(summary).toContainText('25,00');await expect(summary).toContainText('35,00')
  const response=await request.get(api+`/me/financeiro/resumo?competencia=${reference.slice(0,7)}`,{headers:headers()})
  const value=await response.json() as Schemas['ResumoIndividual']
  expect(value.saldoPendente).toBe('35.00')
  await page.getByRole('combobox',{name:'Situação das suas parcelas',exact:true}).selectOption('PAGAS')
  await expect(page.getByText('Nenhuma despesa no seu histórico.',{exact:true})).toBeVisible()
})

test('data opcional de término tem rótulo, ajuda e foco e cabe no celular nos dois temas', async ({ page }) => {
  test.setTimeout(90000)
  const folder = '../.devops-local/interface/imagens/recorrencia-fim-2026-11-21'
  await mkdir(folder, { recursive: true })
  for (const colorScheme of ['light', 'dark'] as const) for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await enter(page, '/republica/despesas')
    await page.getByRole('button', { name: '＋ Nova despesa', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Nova despesa' })
    await expect(dialog.getByLabel('Repetir até (opcional)', { exact: true })).toHaveCount(0)
    await dialog.getByRole('checkbox', { name: 'Repetir mensalmente', exact: true }).check()
    const end = dialog.getByLabel('Repetir até (opcional)', { exact: true })
    await expect(end).toHaveValue(''); await expect(end).not.toHaveAttribute('required')
    await expect(end).toHaveAccessibleDescription(/Deixe em branco para repetir sem prazo/)
    await end.fill(endDate); await end.focus(); await expect(end).toBeFocused()
    await end.press('Tab')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    await end.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${folder}/termino-${colorScheme}-${width}.png`, fullPage: true })
    await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible()
    await expect(page.getByRole('button', { name: '＋ Nova despesa', exact: true })).toBeFocused()
  }
})
test('edição da recorrência vale no futuro e desativação preserva a conta parcial',async({page,request})=>{
  await enter(page,'/republica/despesas')
  await page.locator('summary').filter({hasText:'Contas recorrentes'}).click()
  await page.getByRole('button',{name:'Editar recorrência',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Editar recorrência mensal'})
  await expect(dialog.getByLabel('Repetir até (opcional)', { exact: true })).toHaveValue(endDate)
  await dialog.getByLabel('Repetir até (opcional)', { exact: true }).fill('')
  await dialog.getByLabel('Valor total (R$)',{exact:true}).fill('180.00')
  await dialog.getByLabel('Dia de vencimento',{exact:true}).fill('31')
  await dialog.getByRole('button',{name:'Salvar recorrência',exact:true}).click()
  await expect(dialog).not.toBeVisible()
  const saved=await (await request.get(api+`/recorrencias/${recurring.id}`,{headers:headers()})).json() as Schemas['Recorrencia']
  expect(saved.configuracoes[0].valorTotal).toBe('180.00')
  expect(saved.fim).toBeNull()
  expect((await (await request.get(api+`/despesas/${expense.id}`,{headers:headers()})).json() as Schemas['Despesa']).valorTotal).toBe('120.00')
  await page.getByRole('button',{name:'Ver meses',exact:true}).click()
  await expect(page.getByRole('region',{name:'Meses da recorrência'})).toContainText('Conta gerada')
  await page.getByRole('button',{name:'Desativar',exact:true}).click()
  await page.getByRole('dialog',{name:'Desativar recorrência'}).getByRole('button',{name:'Desativar recorrência',exact:true}).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.locator('.finance-recurring-row').first()).toContainText('Desativada')
})
test('novos controles e resumo cabem nos temas e larguras sem cortes',async({page})=>{
  test.setTimeout(90000)
  const folder='../.devops-local/interface/imagens/financeiro-22'
  await mkdir(folder,{recursive:true})
  for(const colorScheme of ['light','dark'] as const)for(const width of [320,390,768,1024,1366,1440]) {
    await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme,reducedMotion:'reduce'})
    await enter(page,'/republica/despesas')
    await expect(page.locator('#despesas li')).toHaveCount(1)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true)
    await page.screenshot({path:`${folder}/despesas-${colorScheme}-${width}.png`,fullPage:true})
    await page.getByRole('link',{name:'Meu financeiro',exact:true}).first().click()
    await expect(page.getByRole('region',{name:'Resumo do seu financeiro'})).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true)
    await page.screenshot({path:`${folder}/pessoal-${colorScheme}-${width}.png`,fullPage:true})
  }
  await page.setViewportSize({width:1440,height:768})
  await page.evaluate(()=>{document.body.style.zoom='2'})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true)
  await page.evaluate(()=>{document.body.style.zoom=''})
})
test('falha no resumo permite nova tentativa e mudança de mês não exibe totais antigos',async({page})=>{
  let unavailable=true
  await page.route('**/api/me/financeiro/resumo**',async route=>{
    if(unavailable)return route.fulfill({status:503,json:{error:{code:'DATABASE_UNAVAILABLE',message:'Banco temporariamente indisponível.'}},headers:{'X-Request-Id':'12345678-1234-4234-8234-123456789abc'}})
    return route.continue()
  })
  await enter(page,'/republica/financeiro')
  await expect(page.getByRole('alert')).toContainText('Banco temporariamente indisponível.')
  await expect(page.getByRole('alert')).not.toContainText('12345678-1234-4234-8234-123456789abc')
  await page.getByText('Detalhes para suporte', {exact:true}).click()
  await expect(page.locator('.workspace-error-support code')).toHaveText('12345678-1234-4234-8234-123456789abc')
  unavailable=false
  await page.getByRole('button',{name:'Tentar carregar financeiro',exact:true}).click()
  await expect(page.getByRole('region',{name:'Resumo do seu financeiro'})).toContainText('35,00')
  let release!:()=>void
  const gate=new Promise<void>(resolve=>{release=resolve})
  await page.route('**/api/me/financeiro/resumo?competencia=2000-01',async route=>{await gate;await route.continue()})
  await page.getByLabel('Mês do vencimento',{exact:true}).fill('2000-01')
  await expect(page.getByRole('region',{name:'Resumo do seu financeiro'})).not.toBeVisible()
  release()
  await expect(page.getByRole('region',{name:'Resumo do seu financeiro'})).toContainText('0,00')
  await expect(page.getByText('Nenhuma despesa no seu histórico.',{exact:true})).toBeVisible()
})
