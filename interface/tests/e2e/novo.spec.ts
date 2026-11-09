import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'

test('autentica, copia o convite e registra pagamento com comprovante no painel novo', async ({ page, context }) => {
  if (process.env.PLAYWRIGHT_STATIC === '1') {
    await page.route('**/*', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/' || path === '/novo' || path.startsWith('/novo/')) {
        return route.fulfill({ path: fileURLToPath(new URL('../../dist/index.html', import.meta.url)) })
      }
      if (/^\/(?:assets|fonts)\/[\w./-]+$/.test(path)) {
        return route.fulfill({ path: fileURLToPath(new URL('../../dist' + path, import.meta.url)) })
      }
      return route.fallback()
    })
  }

  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  let registered = false
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/auth/login') {
      expect(request.method()).toBe('POST')
      expect(request.postDataJSON()).toEqual({ email: 'ana@example.com', senha: 'teste1234' })
      return route.fulfill({ json: { token: 'token-novo' } })
    }

    expect(request.headers().authorization).toBe('Bearer token-novo')
    if (path === '/api/pagamentos') {
      expect(request.method()).toBe('POST')
      expect(request.headers()['idempotency-key']).toBeTruthy()
      const body = request.postDataBuffer()?.toString() ?? ''
      expect(body).toContain('filename="comprovante.pdf"')
      expect(body).toContain('rateio-1')
      registered = true
      return route.fulfill({ status: 201, json: {} })
    }
    const payloads = {
      '/api/me': { id: 'u1', nome: 'Ana', email: 'ana@example.com', tipoUsuario: 'USUARIO_ADMIN', membro: { id: 'm1', republicaId: 'c1' } },
      '/api/republicas/atual': { id: 'c1', nome: 'Casa Aurora', codigoEntrada: 'AURORA01', adminId: 'u1' },
      '/api/dashboard': { totalPendente: '0', totalPagoNoMes: '0', tarefasAbertas: 0 },
      '/api/membros': [{ id: 'm1', usuarioId: 'u1', ativo: true, usuario: { id: 'u1', nome: 'Ana' } }],
      '/api/despesas': [{
        id: 'd1', titulo: 'Internet', categoria: 'Serviços', valorTotal: '50', vencimento: '2026-11-18',
        rateios: [{ id: 'rateio-1', membroId: 'm1', valorDevido: '50', valorPago: registered ? '50' : '0' }],
      }],
    }
    if (Object.hasOwn(payloads, path)) {
      return route.fulfill({ json: payloads[path as keyof typeof payloads] })
    }
    throw new Error('Rota inesperada: ' + path)
  })

  await page.goto('/novo/login')
  await page.getByLabel('E-mail').fill('ana@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('teste1234')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/novo\/?$/)
  await expect(page.getByText(/Casa Aurora/).filter({ visible: true }).first()).toBeVisible()
  await page.getByRole('button', { name: /copiar.*(?:convite|código)/i }).first().click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('AURORA01')
  await expect(page.getByRole('status').filter({ hasText: 'Código copiado.' })).toBeVisible()
  await page.getByRole('button', { name: 'Pagar', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar pagamento' })
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'comprovante.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4'),
  })
  await expect(dialog.getByText('comprovante.pdf', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Registrar', exact: true }).click()
  await expect(page.getByText('Pagamento registrado.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pagar', exact: true })).toHaveCount(0)
})
