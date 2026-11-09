import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'

test('entra por convite e carrega o resumo da república', async ({ page }) => {
  if (process.env.PLAYWRIGHT_STATIC === '1') {
    await page.route('**/*', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/legado' || /^\/assets\/[\w.-]+$/.test(path)) {
        const file = path === '/legado' ? 'index.html' : path.slice(1)
        return route.fulfill({ path: fileURLToPath(new URL('../../dist/' + file, import.meta.url)) })
      }
      return route.fallback()
    })
  }
  let joined = false
  let created = false
  let paid = false
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/login') {
      expect(route.request().postDataJSON()).toEqual({ email: 'ana@example.com', senha: 'teste1234' })
      return route.fulfill({ json: { token: 'token-de-teste' } })
    }
    expect(route.request().headers().authorization).toBe('Bearer token-de-teste')
    if (path === '/api/me') return route.fulfill({ json: { id: 'u1', nome: 'Ana', tipoUsuario: 'USUARIO_ADMIN', membro: joined ? { id: 'm1' } : null } })
    if (path === '/api/republicas/entrar') {
      expect(route.request().postDataJSON()).toEqual({ codigoEntrada: 'AURORA01' })
      joined = true
      return route.fulfill({ status: 201, json: {} })
    }
    if (path === '/api/republicas/atual') return route.fulfill({ json: { nome: 'República Aurora', adminId: 'u1' } })
    if (path === '/api/membros') return route.fulfill({ json: [{ id: 'm1', usuario: { nome: 'Ana' } }, { id: 'm2', usuario: { nome: 'Pedro' } }] })
    if (path === '/api/despesas' && route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({
        titulo: 'Internet', categoria: 'Serviços', valorTotal: '100', vencimento: '2026-11-18', membroIds: ['m1', 'm2'],
      })
      created = true
      return route.fulfill({ status: 201, json: {} })
    }
    if (path === '/api/despesas') return route.fulfill({ json: created ? [{
      id: 'd1', titulo: 'Internet', categoria: 'Serviços', valorTotal: '100', vencimento: '2026-11-18',
      rateios: [{ id: 'r1', membroId: 'm1', valorDevido: '50', valorPago: paid ? '20' : '0' }],
    }] : [] })
    if (path === '/api/pagamentos') {
      expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/)
      expect(route.request().headers()['content-type']).toContain('multipart/form-data')
      expect(route.request().postData()).toContain('filename="comprovante.pdf"')
      expect(route.request().postData()).toContain('r1')
      paid = true
      return route.fulfill({ status: 201, json: {} })
    }
    if (path === '/api/dashboard') return route.fulfill({ json: { totalPendente: '1245.80', totalPagoNoMes: '3280.00', tarefasAbertas: 3 } })
    if (path === '/api/auth/logout') return route.fulfill({ status: 204 })
    throw new Error('Rota inesperada: ' + path)
  })
  await page.goto('/legado')
  await page.getByLabel('E-mail').fill('ana@example.com')
  await page.getByLabel('Senha').fill('teste1234')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.getByLabel('Código de entrada').fill('AURORA01')
  await page.getByRole('button', { name: 'Entrar na república' }).click()
  await expect(page.getByRole('heading', { name: 'Sua casa, em dia.' })).toBeVisible()
  await expect(page.getByText('República Aurora')).toBeVisible()
  await expect(page.getByText(/1\.245,80/)).toBeVisible()
  await page.getByRole('button', { name: 'Nova despesa' }).click()
  await page.getByLabel('Título').fill('Internet')
  await page.getByLabel('Categoria').fill('Serviços')
  await page.getByLabel('Valor total').fill('100')
  await page.getByLabel('Vencimento').fill('2026-11-18')
  await page.getByRole('checkbox', { name: 'Ana' }).check()
  await page.getByRole('checkbox', { name: 'Pedro' }).check()
  await page.getByRole('button', { name: 'Cadastrar despesa' }).click()
  await expect(page.getByRole('heading', { name: 'Internet' })).toBeVisible()
  await page.getByRole('button', { name: 'Registrar pagamento' }).click()
  await page.getByLabel('Valor pago').fill('20')
  await page.getByLabel('Comprovante (opcional)').setInputFiles({
    name: 'comprovante.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4'),
  })
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(page.getByText('Pagamento registrado.')).toBeVisible()
  await expect(page.getByText(/Seu saldo:.*30,00/)).toBeVisible()
  await page.reload()
  await expect(page.getByText('República Aurora')).toBeVisible()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible()
})
