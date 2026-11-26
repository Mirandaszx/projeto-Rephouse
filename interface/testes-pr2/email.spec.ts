import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { emailLink } from './auxiliares/email-harness'
import { contrast } from './auxiliares/contraste'

// Instancia HTTP isolada por arquivo; os controles reais permanecem habilitados.
test.use({ extraHTTPHeaders: { 'x-interface-test-run': process.env.REPHOUSE_INTERFACE_TEST_RUN ?? '', 'x-interface-suite': 'email.spec.ts' } })

test('login por link exige ação explícita, remove segredo da URL e mantém a conta existente', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', {name:'Entrar por link no e-mail',exact:true}).click()
  await expect(page.getByLabel('Senha',{exact:true})).toHaveCount(0)
  await page.getByLabel('E-mail',{exact:true}).fill('gestao-removido@integracao.rephouse.test')
  await page.getByRole('button',{name:'Enviar link de acesso',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Confira seu e-mail.',exact:true})).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('rephouse-token'))).toBeNull()
  await expect(page.getByRole('button',{name:/Reenviar em/})).toBeDisabled()
  const link = await emailLink(page.request,'gestao-removido@integracao.rephouse.test')
  let confirmations = 0
  page.on('request', req => { if(req.url().endsWith('/api/auth/email/confirmar') && req.method()==='POST') confirmations++ })
  await page.goto(link)
  await expect(page).toHaveURL(/\/confirmar-email$/)
  await expect(page.getByRole('button',{name:'Confirmar e entrar',exact:true})).toBeVisible()
  expect(confirmations).toBe(0)
  await page.getByRole('button',{name:'Confirmar e entrar',exact:true}).click()
  await expect(page).toHaveURL(/\/republica$/)
  expect(confirmations).toBe(1)
  expect(await page.evaluate(() => sessionStorage.getItem('rephouse-token'))).toBeTruthy()
})

test('entrar por link com e-mail sem conta cria a conta pedindo nome e senha na confirmação', async ({ page }) => {
  const email = `link-novo-${Date.now()}@integracao.rephouse.test`
  await page.goto('/login')
  await page.getByRole('button', {name:'Entrar por link no e-mail',exact:true}).click()
  await page.getByLabel('E-mail',{exact:true}).fill(email)
  await page.getByRole('button',{name:'Enviar link de acesso',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Confira seu e-mail.',exact:true})).toBeVisible()
  await expect(page.getByText('Se ainda não tem, ele cria uma',{exact:false})).toBeVisible()
  await page.goto(await emailLink(page.request,email))
  await page.getByRole('button',{name:'Confirmar e entrar',exact:true}).click()
  // O link continua valendo: a tela só pede os dados que faltam para criar a conta.
  await expect(page.getByRole('heading',{name:'Crie sua conta.',exact:true})).toBeVisible()
  await expect(page.getByLabel('Nome',{exact:true})).toBeFocused()
  expect(await page.evaluate(() => sessionStorage.getItem('rephouse-token'))).toBeNull()
  await page.getByLabel('Nome',{exact:true}).fill('Pessoa Nova')
  await page.getByLabel('Senha',{exact:true}).fill('Senha-interface-teste-2026')
  await page.getByRole('button',{name:'Criar conta e entrar',exact:true}).click()
  await expect(page).toHaveURL(/\/republica$/)
  expect(await page.evaluate(() => sessionStorage.getItem('rephouse-token'))).toBeTruthy()
  // A conta criada já entra com a senha escolhida.
  await page.evaluate(() => sessionStorage.clear())
  await page.goto('/login')
  await page.getByLabel('E-mail',{exact:true}).fill(email)
  await page.getByLabel('Senha',{exact:true}).fill('Senha-interface-teste-2026')
  await page.getByRole('button',{name:'Entrar na minha conta',exact:true}).click()
  await expect(page).toHaveURL(/\/republica$/)
})

test('link incompleto orienta a recuperação e não envia confirmação', async ({ page }) => {
  let requests = 0
  page.on('request', req => { if(req.url().endsWith('/api/auth/email/confirmar'))requests++ })
  await page.goto('/confirmar-email#token=incorreto')
  await expect(page).toHaveURL(/\/confirmar-email$/)
  await expect(page.getByText('O link está incompleto',{exact:false})).toBeVisible()
  await expect(page.getByRole('button',{name:'Confirmar e entrar',exact:true})).toBeDisabled()
  expect(requests).toBe(0)
  await page.getByRole('link',{name:'Voltar ao login',exact:true}).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('API antiga ou envio desabilitado não permite cadastro sem confirmação nem anuncia envio fictício', async ({ page }) => {
  let registrations=0
  page.on('request',req=>{if(req.url().endsWith('/api/auth/register') && req.method()==='POST')registrations++})
  await page.route('**/api/auth/metodos',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({google:{habilitado:false,clientId:null}})}))
  await page.goto('/cadastro')
  await expect(page.getByText('O cadastro está temporariamente indisponível.',{exact:false})).toBeVisible()
  await expect(page.getByRole('button',{name:'Criar minha conta',exact:true})).toBeDisabled()
  await page.getByLabel('Nome',{exact:true}).fill('Pessoa fictícia')
  await page.getByLabel('E-mail',{exact:true}).fill('sem-envio@example.test')
  await page.getByLabel('Senha',{exact:true}).fill('Senha-exclusiva-de-teste-2026')
  await page.locator('.auth-form').evaluate(form=>(form as HTMLFormElement).requestSubmit())
  expect(registrations).toBe(0)
  await expect(page.getByRole('heading',{name:'Confira seu e-mail.',exact:true})).toHaveCount(0)
})

test('falha de confirmação mantém mensagem legível e código de suporte recolhido', async ({ page }) => {
  await page.route('**/api/auth/email/confirmar', route => route.fulfill({status:401,contentType:'application/json',headers:{'X-Request-Id':'00000000-0000-4000-8000-000000000001'},body:JSON.stringify({error:{code:'EMAIL_LINK_INVALID',message:'Este link é inválido, expirou ou já foi utilizado. Solicite outro no mesmo navegador.'}})}))
  await page.goto('/confirmar-email#id=00000000-0000-4000-8000-000000000002&token='+'a'.repeat(43))
  await page.getByRole('button',{name:'Confirmar e entrar',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('Solicite outro no mesmo navegador.')
  await expect(page.getByRole('alert')).not.toContainText('00000000')
  expect(await page.evaluate(()=>sessionStorage.getItem('rephouse-token'))).toBeNull()
})

test('superfícies de e-mail mantêm composição em celular e computador, nos dois temas', async ({ page }) => {
  const dir='../.devops-local/interface/imagens/autenticacao-email-2026-11-20'
  await mkdir(dir,{recursive:true})
  await page.addInitScript(()=>localStorage.setItem('rephouse-appearance','system'))
  for (const width of [320,390,768,1440]) for (const theme of ['claro','escuro']) {
    await page.setViewportSize({width,height:900})
    await page.emulateMedia({colorScheme:theme === 'claro' ? 'light' : 'dark'})
    await page.goto('/login')
    await expect(page.locator('html')).toHaveAttribute('data-theme',theme === 'claro' ? 'light' : 'dark')
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.',exact:true})).toBeVisible()
    await page.getByRole('button',{name:'Entrar por link no e-mail',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Entre pelo seu e-mail.',exact:true})).toBeVisible()
    await expect(page.locator('.auth-content')).toHaveCSS('opacity','1')
    expect(await contrast(page.getByRole('button',{name:'Usar minha senha',exact:true}))).toBeGreaterThanOrEqual(4.5)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({path:`${dir}/link-${width}-${theme}.png`,fullPage:true})
    await page.goto('/confirmar-email')
    await expect(page.getByRole('heading',{name:'Confirme seu acesso.',exact:true})).toBeVisible()
    await expect(page.locator('.auth-content')).toHaveCSS('opacity','1')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({path:`${dir}/confirmacao-${width}-${theme}.png`,fullPage:true})
  }
})
