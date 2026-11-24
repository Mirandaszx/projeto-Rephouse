import { test, expect, type Page } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'
import sharp from 'sharp'
import { contrast } from './auxiliares/contraste'

test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'perfil-foto.spec.ts' } })
type Account = { id: string; token: string; email: string }
let accounts: Record<string, Account>
let house: { id: string; codigoEntrada: string }
const api='http://127.0.0.1:3405/api'
const photo=(color='#ac3a28')=>sharp({create:{width:240,height:160,channels:3,background:color}}).png().toBuffer()
async function enter(page:Page,name='perfil-admin',path='/republica/perfil') {
  await page.goto('/login');await page.evaluate(token=>sessionStorage.setItem('rephouse-token',token),accounts[name].token);await page.goto(path)
  await expect(page.getByRole('heading',{level:1})).toBeVisible()
  if(path.endsWith('/perfil')) await expect(page.getByRole('heading',{name:'Meu perfil',exact:true})).toBeVisible()
}
async function choose(page:Page,buffer:Buffer) {
  await page.getByLabel('Escolher foto de perfil',{exact:true}).setInputFiles({name:'foto.png',mimeType:'image/png',buffer})
  const dialog=page.getByRole('dialog',{name:'Ajustar foto de perfil',exact:true})
  await expect(dialog).toBeVisible();await expect(dialog.locator('.reactEasyCrop_Image')).toHaveJSProperty('complete',true)
  await expect(dialog.locator('.reactEasyCrop_Image')).toHaveJSProperty('naturalWidth',240)
  return dialog
}
test.beforeAll(async({request})=>{
  accounts=JSON.parse(await readFile('../.devops-local/interface/gestao-contas.json','utf8'))
  const response=await request.post(api+'/republicas',{headers:{Authorization:`Bearer ${accounts['perfil-admin'].token}`},data:{nome:'Casa Perfil'}})
  expect(response.status()).toBe(201);house=await response.json()
  expect((await request.post(api+'/republicas/entrar',{headers:{Authorization:`Bearer ${accounts['perfil-morador'].token}`},data:{codigoEntrada:house.codigoEntrada}})).status()).toBe(201)
})
test('perfil apresenta dados reais; enquadramento e zoom salvam a foto somente após confirmação',async({page,request})=>{
  await enter(page)
  await expect(page.getByText(accounts['perfil-admin'].email,{exact:true})).toBeVisible()
  // O nome da casa também aparece na barra lateral desde 24/11/2026; aqui interessa o do conteúdo do perfil.
  await expect(page.locator('.workspace-page').getByText('Casa Perfil',{exact:true})).toBeVisible()
  await expect(page.getByText('E-mail ainda não confirmado',{exact:true})).toBeVisible()
  const dialog=await choose(page,await photo())
  const zoom=dialog.getByRole('slider',{name:'Zoom da foto'})
  await zoom.focus();await zoom.press('ArrowRight');await expect(zoom).toHaveValue('1.05')
  const container=dialog.locator('.reactEasyCrop_Container')
  const initialPosition=await dialog.locator('.reactEasyCrop_Image').evaluate(el=>(el as HTMLElement).style.transform)
  await container.focus();await container.press('ArrowRight')
  await expect.poll(()=>dialog.locator('.reactEasyCrop_Image').evaluate(el=>(el as HTMLElement).style.transform)).not.toBe(initialPosition)
  await dialog.getByRole('button',{name:'Salvar foto',exact:true}).click()
  await expect(dialog).toHaveCount(0);await expect(page.locator('.profile-photo-large img')).toBeVisible()
  const own=await request.get(api+'/me',{headers:{Authorization:`Bearer ${accounts['perfil-admin'].token}`}})
  expect((await own.json()).foto.versao).toMatch(/^[a-f0-9]{64}$/)
  await page.reload();await expect(page.locator('.profile-photo-large img')).toBeVisible()
})
test('cancelar preserva a foto; uma falha mantém o editor aberto e permite tentar novamente',async({page,request})=>{
  await enter(page)
  const before=await(await request.get(api+'/me',{headers:{Authorization:`Bearer ${accounts['perfil-admin'].token}`}})).json()
  let dialog=await choose(page,await photo('#285c9a'))
  await dialog.press('Escape');await expect(dialog).toHaveCount(0)
  const after=await(await request.get(api+'/me',{headers:{Authorization:`Bearer ${accounts['perfil-admin'].token}`}})).json()
  expect(after.foto).toEqual(before.foto)
  await page.route('**/api/me/foto',route=>route.request().method()==='POST'?route.fulfill({status:503,json:{error:{code:'TEMPORARY_FAILURE',message:'Não foi possível salvar a foto. Tente novamente.'}}}):route.continue(),{times:1})
  dialog=await choose(page,await photo('#285c9a'))
  await dialog.getByRole('button',{name:'Salvar foto',exact:true}).click()
  await expect(dialog.getByRole('alert')).toContainText('Não foi possível salvar a foto')
  expect((await(await request.get(api+'/me',{headers:{Authorization:`Bearer ${accounts['perfil-admin'].token}`}})).json()).foto).toEqual(before.foto)
  await dialog.getByRole('button',{name:'Salvar foto',exact:true}).click();await expect(dialog).toHaveCount(0)
})
test('envio lento bloqueia duplicação e Escape; exclusão confirmada volta às iniciais',async({page})=>{
  await page.addInitScript(()=>{let count=0;const revoke=URL.revokeObjectURL.bind(URL);Object.defineProperty(window,'photoReleaseCount',{get:()=>count});URL.revokeObjectURL=url=>{count++;revoke(url)}})
  await enter(page)
  let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve});let calls=0
  await page.route('**/api/me/foto',async route=>{if(route.request().method()!=='POST')return route.continue();calls++;await pending;await route.continue()})
  const dialog=await choose(page,await photo('#387344'))
  try {
    await dialog.getByRole('button',{name:'Salvar foto',exact:true}).click()
    await expect(dialog.getByRole('button',{name:'Salvando…',exact:true})).toBeDisabled()
    await dialog.getByRole('button',{name:'Salvando…',exact:true}).click({force:true})
    await dialog.press('Escape');await expect(dialog).toBeVisible();expect(calls).toBe(1)
  } finally {release()}
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.profile-photo-large img')).toBeVisible()
  const releasedBefore=await page.evaluate(()=>Reflect.get(window,'photoReleaseCount') as number)
  await page.getByRole('button',{name:'Remover foto',exact:true}).click()
  const confirmation=page.getByRole('dialog',{name:'Remover foto de perfil',exact:true})
  await confirmation.getByRole('button',{name:'Remover foto',exact:true}).click();await expect(confirmation).toHaveCount(0)
  await expect(page.locator('.profile-photo-large img')).toHaveCount(0)
  await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'photoReleaseCount') as number)).toBeGreaterThan(releasedBefore)
  await expect(page.getByRole('button',{name:'Adicionar foto',exact:true})).toBeVisible()
})
test('arquivo inválido é rejeitado antes do upload; perfil sem vínculo continua acessível',async({page})=>{
  await enter(page,'perfil-sem-casa')
  await expect(page.getByText('Sem vínculo ativo com uma república',{exact:true})).toBeVisible()
  let posts=0;page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/me/foto'))posts++})
  await page.getByLabel('Escolher foto de perfil',{exact:true}).setInputFiles({name:'foto.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')})
  await expect(page.getByRole('alert')).toContainText('SVG e GIF não são aceitos')
  await page.getByLabel('Escolher foto de perfil',{exact:true}).setInputFiles({name:'foto.png',mimeType:'image/png',buffer:Buffer.alloc(5*1024*1024+1)})
  await expect(page.getByRole('alert')).toContainText('até 5 MiB');expect(posts).toBe(0)
})
test('foto aparece para a casa atual, requisições são deduplicadas e falha de leitura mostra iniciais',async({page,request})=>{
  const file=await photo(),body={imagem:{name:'foto.png',mimeType:'image/png',buffer:file},recorte:JSON.stringify({x:0,y:0,largura:160,altura:160})}
  expect((await request.post(api+'/me/foto',{headers:{Authorization:`Bearer ${accounts['perfil-admin'].token}`},multipart:body})).status()).toBe(200)
  let downloads=0,expectedToken=accounts['perfil-admin'].token;page.on('request',request=>{if(request.url().includes(`/usuarios/${accounts['perfil-admin'].id}/foto`)){expect(request.url()).not.toContain('token');expect(request.headers().authorization).toBe(`Bearer ${expectedToken}`);downloads++}})
  await enter(page,'perfil-admin','/republica')
  await expect(page.locator('.workspace-profile-link img')).toBeVisible();expect(downloads).toBe(1)
  for(const theme of ['light','dark'] as const)for(const width of [390,1440]){
    await page.setViewportSize({width,height:900})
    await page.getByRole('switch',{name:'Modo escuro',exact:true}).press(theme==='dark'?'ArrowRight':'ArrowLeft')
    for(const selector of ['.workspace-profile-link','.rep-mobile-account-link:has(.profile-avatar)']){
      const link=page.locator(selector)
      if(!await link.isVisible())continue
      const avatar=link.locator('.profile-avatar')
      await expect(avatar.locator('img')).toBeVisible()
      const geometry=await avatar.evaluate(el=>{
        const rect=el.getBoundingClientRect(),parent=el.parentElement!,style=getComputedStyle(el),parentStyle=getComputedStyle(parent)
        return {width:rect.width,height:rect.height,radius:style.borderTopLeftRadius,overflow:style.overflow,parentWidth:parent.clientWidth,parentHeight:parent.clientHeight,parentRadius:parentStyle.borderTopLeftRadius}
      })
      expect(Math.abs(geometry.width-geometry.height)).toBeLessThanOrEqual(1)
      expect(Math.abs(geometry.width-geometry.parentWidth)).toBeLessThanOrEqual(1)
      expect(Math.abs(geometry.height-geometry.parentHeight)).toBeLessThanOrEqual(1)
      expect(geometry.radius).toBe('50%');expect(geometry.parentRadius).toBe('50%')
      expect(geometry.overflow).toBe('hidden')
    }
  }
  expectedToken=accounts['perfil-morador'].token;await enter(page,'perfil-morador','/republica/moradores')
  await expect(page.locator(`[data-avatar-user="${accounts['perfil-admin'].id}"] img`)).toBeVisible()
  await page.route(`**/api/usuarios/${accounts['perfil-admin'].id}/foto`,route=>route.fulfill({status:404,json:{error:{code:'NOT_FOUND',message:'Foto indisponível.'}}}))
  await page.reload();await expect(page.locator(`[data-avatar-user="${accounts['perfil-admin'].id}"] img`)).toHaveCount(0)
})
test('perfil e editor cabem nos dois temas, teclado, zoom de página e janela baixa',async({page})=>{
  test.setTimeout(90000)
  const folder='../.devops-local/interface/imagens/perfil-foto-2026-11-22';await mkdir(folder,{recursive:true})
  await page.emulateMedia({reducedMotion:'reduce'})
  for(const theme of ['light','dark'] as const)for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});await enter(page)
    await page.getByRole('switch',{name:'Modo escuro',exact:true}).press(theme==='dark'?'ArrowRight':'ArrowLeft')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    expect(await contrast(page.getByRole('heading',{name:'Foto de perfil',exact:true}))).toBeGreaterThanOrEqual(4.5)
    await page.screenshot({path:`${folder}/perfil-${theme}-${width}.png`,fullPage:true})
    const dialog=await choose(page,await photo());await expect(dialog.getByRole('button',{name:'Salvar foto',exact:true})).toBeInViewport()
    await dialog.getByRole('slider',{name:'Zoom da foto'}).focus()
    expect(await dialog.getByRole('slider',{name:'Zoom da foto'}).evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none')
    await page.screenshot({path:`${folder}/editor-${theme}-${width}.png`,fullPage:false})
    await dialog.press('Escape');await expect(dialog).toHaveCount(0)
  }
  await page.setViewportSize({width:768,height:400});const dialog=await choose(page,await photo())
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).scrollIntoViewIfNeeded();await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeInViewport()
  await dialog.press('Escape');await expect(dialog).toHaveCount(0)
  await page.setViewportSize({width:1440,height:900});await page.locator('html').evaluate(el=>{el.style.zoom='2'})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('enquadramento acompanha arrasto por toque e cancelar devolve o foco sem salvar',async({browser})=>{
  const context=await browser.newContext({baseURL:'http://127.0.0.1:5174',hasTouch:true,colorScheme:'light',viewport:{width:390,height:844},extraHTTPHeaders:{'x-interface-test-run':process.env.REPHOUSE_INTERFACE_TEST_RUN??'','x-interface-suite':'perfil-foto.spec.ts'}})
  try {
    const page=await context.newPage();await enter(page)
    const opener=page.getByRole('button',{name:'Trocar foto',exact:true})
    const chooser=page.waitForEvent('filechooser');await opener.click()
    await(await chooser).setFiles({name:'foto.png',mimeType:'image/png',buffer:await photo()})
    const dialog=page.getByRole('dialog',{name:'Ajustar foto de perfil',exact:true})
    await expect(dialog.locator('.reactEasyCrop_Image')).toHaveJSProperty('naturalWidth',240)
    await dialog.getByRole('slider',{name:'Zoom da foto'}).press('End')
    const img=dialog.locator('.reactEasyCrop_Image'),before=await img.evaluate(el=>(el as HTMLElement).style.transform)
    const bounds=(await dialog.locator('.reactEasyCrop_Container').boundingBox())!,x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2
    const session=await context.newCDPSession(page)
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+28,y:y+12}]})
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    await expect.poll(()=>img.evaluate(el=>(el as HTMLElement).style.transform)).not.toBe(before)
    await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()
    expect(await page.evaluate(()=>Object.entries(localStorage).some(([key,value])=>/foto|avatar|blob:/i.test(key+String(value))))).toBe(false)
  } finally {await context.close()}
})

test('API anterior não oferece upload indisponível nem inventa ausência de confirmação',async({page})=>{
  // Compatibilidade visual com a resposta anterior; as regras novas são exercitadas por HTTP real nos outros cenários.
  await page.route('**/api/me',async route=>{
    const response=await route.fetch(),body=await response.json();delete body.foto;delete body.emailConfirmadoEm
    await route.fulfill({response,json:body})
  })
  await enter(page)
  await expect(page.getByRole('button',{name:'Adicionar foto',exact:true})).toBeDisabled()
  await expect(page.getByText('Envio de foto indisponível nesta versão da API.',{exact:true})).toBeVisible()
  await expect(page.getByText('Informação de confirmação indisponível',{exact:true})).toBeVisible()
  await expect(page.getByText('E-mail ainda não confirmado',{exact:true})).toHaveCount(0)
})
