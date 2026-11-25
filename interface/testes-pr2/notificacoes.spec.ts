import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { createDatabase } from '../../codigo/infraestrutura/banco/client'
import { processDueNotifications } from '../../codigo/modulos/notificacoes/notificacoes.service'
import { civilDate } from '../../codigo/configuracao/time-zone'
import type { components } from '../../integracao/api'

type Schemas=components['schemas']
type Account={token:string;id:string;email:string}
const suiteHeaders={'x-interface-test-run':process.env.REPHOUSE_INTERFACE_TEST_RUN??'','x-interface-suite':'notificacoes.spec.ts'}
test.use({extraHTTPHeaders:suiteHeaders})
test.describe.configure({mode:'serial'})
let accounts:Record<string,Account>,anaMember:Schemas['Membro'],brunoMember:Schemas['Membro']
let houseCode:string
let created:Schemas['Tarefa']
const api='http://127.0.0.1:3405/api'
async function send<T>(request:APIRequestContext,who:string,method:string,path:string,data?:unknown){
  const response=await request.fetch(api+path,{method,data,headers:{Authorization:`Bearer ${accounts[who]!.token}`}})
  expect(response.ok(),`${method} ${path}: ${await response.text()}`).toBe(true)
  return response.status()===204?undefined as T:await response.json() as T
}
async function enter(page:Page,who='avisos-ana'){
  await page.goto('/login');await page.evaluate(token=>sessionStorage.setItem('rephouse-token',token),accounts[who]!.token)
  await page.goto('/republica/tarefas')
  await expect(page.getByRole('heading',{level:1,name:'Tarefas',exact:true})).toBeVisible()
}
test.beforeAll(async({request})=>{
  accounts=JSON.parse(await readFile('../.devops-local/interface/gestao-contas.json','utf8'))
  const house=await send<Schemas['Republica']>(request,'avisos-admin','POST','/republicas',{nome:'Casa das notificações'})
  houseCode=house.codigoEntrada
  anaMember=await send(request,'avisos-ana','POST','/republicas/entrar',{codigoEntrada:house.codigoEntrada})
  brunoMember=await send(request,'avisos-bruno','POST','/republicas/entrar',{codigoEntrada:house.codigoEntrada})
})

test('morador cria disponível, assume, conclui, reabre e libera pela interface real',async({page,request})=>{
  await enter(page)
  await page.getByRole('button',{name:'Nova tarefa',exact:true}).click()
  await page.getByLabel('Título',{exact:true}).fill('Varrer a casa em conjunto')
  const response=page.waitForResponse(r=>r.url().endsWith('/api/tarefas')&&r.request().method()==='POST')
  await page.getByRole('button',{name:'Criar tarefa',exact:true}).click()
  expect((await response).status()).toBe(201)
  const data=await (await response).json();created=data
  expect(created.responsavelId).toBeNull();expect(created.criadorId).toBe(accounts['avisos-ana']!.id)
  const row=page.locator('.rep-task-row').filter({hasText:created.titulo})
  await expect(row.getByText('Disponível para assumir',{exact:true})).toBeVisible()
  await row.getByRole('button',{name:`Assumir tarefa ${created.titulo}`,exact:true}).click()
  await expect(row.getByRole('button',{name:`Deixar disponível a tarefa ${created.titulo}`})).toBeVisible()
  // Concluir e reabrir pelo mouse e pelo teclado (botões desde 24/11/2026).
  await row.getByRole('button',{name:`Concluir tarefa ${created.titulo}`,exact:true}).click()
  const reabrir=row.getByRole('button',{name:`Reabrir tarefa ${created.titulo}`,exact:true})
  await expect(reabrir).toBeEnabled();await reabrir.focus();await page.keyboard.press('Enter')
  await expect(row.getByRole('button',{name:`Concluir tarefa ${created.titulo}`,exact:true})).toBeVisible()
  await row.getByRole('button',{name:`Deixar disponível a tarefa ${created.titulo}`} ).click()
  await expect(row.getByRole('button',{name:`Assumir tarefa ${created.titulo}`})).toBeVisible()
  const persisted=await send<Schemas['Tarefa']>(request,'avisos-ana','GET',`/tarefas/${created.id}`)
  expect(persisted.responsavelId).toBeNull();expect(persisted.status).toBe('ABERTA')
})

test('duas abas recebem o evento e sincronizam a leitura sem recarregar',async({page,browser,request})=>{
  await enter(page)
  const context=await browser.newContext({extraHTTPHeaders:suiteHeaders})
  const second=await context.newPage()
  try{
    await enter(second)
    const before=await send<Schemas['NotificacoesNaoLidas']>(request,'avisos-ana','GET','/notificacoes/nao-lidas')
    const noticeTask=await send<Schemas['Tarefa']>(request,'avisos-admin','POST','/tarefas',{titulo:'Conferir a caixa de correspondência'})
    for(const target of [page,second])await expect(target.getByRole('button',{name:`Notificações, ${before.total+1} não lidas`,exact:true})).toBeVisible()
    await page.getByRole('button',{name:/^Notificações/}).click()
    await expect(page.getByText('Atualizado em tempo real',{exact:true})).toBeVisible()
    const panel=page.getByRole('dialog',{name:'Notificações',exact:true})
    await panel.getByRole('button').filter({hasText:noticeTask.titulo}).click()
    await expect(page.getByRole('dialog',{name:'Detalhes da tarefa',exact:true})).toBeVisible()
    await expect(second.getByRole('button',{name:before.total?`Notificações, ${before.total} não lidas`:'Notificações',exact:true})).toBeVisible()
  }finally{await context.close()}
})

test('despesa mostra só a parcela pendente e desaparece após quitação',async({page,request})=>{
  const expense=await send<Schemas['Despesa']>(request,'avisos-admin','POST','/despesas',{titulo:'Internet com vencimento hoje',categoria:'Internet',valorTotal:'100.00',vencimento:civilDate(),membroIds:[anaMember.id,brunoMember.id]})
  const own=expense.rateios.find(share=>share.membroId===anaMember.id)!,other=expense.rateios.find(share=>share.membroId===brunoMember.id)!
  for(const [who,rateioId,valor] of [['avisos-ana',own.id,'20.00'],['avisos-bruno',other.id,'50.00']] as const){
    const payment=await request.post(api+'/pagamentos',{headers:{Authorization:`Bearer ${accounts[who]!.token}`,'Idempotency-Key':randomUUID()},data:{rateioId,valor}});expect(payment.status()).toBe(201)
  }
  // Preparação exclusiva da suíte: o processo real do agendador tem request spec próprio.
  const metadata=JSON.parse(await readFile('../.devops-local/interface/ambiente.json','utf8'))
  const url=new URL(process.env.TEST_DATABASE_URL||'postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test')
  if(url.port!=='5544'||url.pathname!=='/rabbu_mvp_test'||!/^integration_test_[a-f0-9]{32}$/.test(metadata.schema))throw new Error('Destino de teste obrigatório')
  url.searchParams.set('schema',metadata.schema)
  const db=createDatabase(url.toString())
  try{await processDueNotifications(db)}finally{await db.$disconnect()}
  await enter(page)
  await page.getByRole('button',{name:/^Notificações/}).click()
  await page.getByRole('tab',{name:/Despesas/}).click()
  const panel=page.getByRole('dialog',{name:'Notificações',exact:true})
  await expect(panel.getByText('Sua parcela vence hoje',{exact:true})).toBeVisible()
  await panel.getByRole('button').filter({hasText:expense.titulo}).click()
  await expect(page.getByRole('dialog',{name:'Detalhes da despesa',exact:true})).toBeVisible()
  const paid=await request.post(api+'/pagamentos',{headers:{Authorization:`Bearer ${accounts['avisos-ana']!.token}`,'Idempotency-Key':randomUUID()},data:{rateioId:own.id,valor:'30.00'}})
  expect(paid.status()).toBe(201)
  const remaining=await send<{dados:unknown[]}>(request,'avisos-ana','GET','/notificacoes?categoria=DESPESAS');expect(remaining.dados).toHaveLength(0)
})

test('painel preserva temas, foco, movimento reduzido e largura em celular e computador',async({page,request})=>{
  await send(request,'avisos-admin','POST','/tarefas',{titulo:'Organizar os utensílios da cozinha e conferir os produtos de limpeza disponíveis na lavanderia compartilhada'})
  const directory='../.devops-local/interface/imagens/notificacoes-gerais-2026-11-21';await mkdir(directory,{recursive:true})
  for(const width of [320,390,768,1440])for(const theme of ['light','dark'] as const){
    await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'})
    await page.addInitScript(()=>localStorage.setItem('rephouse-appearance','system'))
    await enter(page)
    const trigger=page.getByRole('button',{name:/^Notificações/})
    await trigger.focus();await page.keyboard.press('Enter')
    const panel=page.getByRole('dialog',{name:'Notificações',exact:true})
    await expect(panel).toBeVisible();await expect(panel.getByRole('button',{name:'Fechar notificações'})).toBeFocused()
    await expect(panel.getByRole('tabpanel')).not.toHaveAttribute('aria-busy','true')
    expect(await panel.evaluate(element=>getComputedStyle(element).animationName)).toBe('none')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    const box=await panel.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width)
    expect(await panel.locator('.notifications-tabs').evaluate(element=>element.scrollWidth<=element.clientWidth&&Array.from(element.querySelectorAll('button')).every(tab=>tab.scrollWidth<=tab.clientWidth))).toBe(true)
    await page.screenshot({path:`${directory}/painel-${width}-${theme}.png`})
    await page.keyboard.press('Escape');await expect(panel).not.toBeVisible();await expect(trigger).toBeFocused()
  }
})

test('falha de consulta apresenta erro e permite tentar novamente sem fingir lista vazia',async({page})=>{
  await enter(page)
  // Estabiliza o handshake antes de provocar a falha; não confundir reconciliação inicial com reenvio manual.
  await expect(page.getByRole('button',{name:/^Notificações/})).toHaveAttribute('data-connection','conectado')
  let fail=true
  await page.route('**/api/notificacoes?*',route=>fail?route.fulfill({status:503,json:{error:{code:'RETRY_LATER',message:'Não foi possível consultar os avisos agora. Tente novamente.'}}}):route.fallback())
  await page.getByRole('button',{name:/^Notificações/}).click()
  await expect(page.getByRole('dialog',{name:'Notificações',exact:true}).getByText('Não foi possível consultar os avisos agora. Tente novamente.',{exact:true})).toBeVisible()
  await expect(page.getByText('Nenhum aviso de tarefa por aqui.',{exact:true})).toHaveCount(0)
  fail=false;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click()
  await expect(page.getByRole('tabpanel').getByRole('list')).toBeVisible()
})

test('Todas reúne entrada e saída em tempo real, navega entre três abas e abre moradores ao ler',async({page,request})=>{
  await enter(page)
  await expect(page.getByRole('button',{name:/^Notificações/})).toHaveAttribute('data-connection','conectado')
  await page.getByRole('button',{name:/^Notificações/}).click()
  const panel=page.getByRole('dialog',{name:'Notificações',exact:true})
  const all=panel.getByRole('tab',{name:/^Todas/})
  await expect(all).toHaveAttribute('aria-selected','true')
  await all.focus();await page.keyboard.press('ArrowRight')
  await expect(panel.getByRole('tab',{name:/^Tarefas/})).toBeFocused()
  await page.keyboard.press('ArrowRight');await expect(panel.getByRole('tab',{name:/^Despesas/})).toBeFocused()
  await page.keyboard.press('ArrowRight');await expect(all).toBeFocused()
  await send(request,'avisos-bruno','POST','/republicas/sair',{})
  await expect(panel.getByText('Deixou a república',{exact:true})).toBeVisible()
  await panel.getByRole('button').filter({hasText:'Deixou a república'}).click()
  await expect(page.getByRole('heading',{level:1,name:'Moradores',exact:true})).toBeVisible()
  const previous=await send<{dados:Schemas['Notificacao'][]}>(request,'avisos-ana','GET','/notificacoes?categoria=GERAIS')
  const previousEntries=previous.dados.filter(notice=>notice.tipo==='MEMBRO_ENTROU').length
  await send(request,'avisos-bruno','POST','/republicas/entrar',{codigoEntrada:houseCode})
  await page.getByRole('button',{name:/^Notificações/}).click()
  await expect(page.getByRole('dialog',{name:'Notificações',exact:true}).getByText('Entrou na república',{exact:true})).toHaveCount(previousEntries+1)
  await expect(page.getByRole('dialog',{name:'Notificações',exact:true}).getByText('Entrou na república',{exact:true}).first()).toBeVisible()
})
