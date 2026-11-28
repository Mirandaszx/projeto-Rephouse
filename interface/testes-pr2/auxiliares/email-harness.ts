import { expect, type APIRequestContext, type Page } from '@playwright/test'
import type { components } from '../../../integracao/api'

const api = 'http://127.0.0.1:3405/api'
const origin = 'http://127.0.0.1:5174'
async function emailMessage(request: APIRequestContext, email: string) {
  const runId = process.env.REPHOUSE_INTERFACE_TEST_RUN
  if (!runId) throw new Error('Execute pelo harness de interface isolado.')
  const r = await request.get(`http://127.0.0.1:3405/__interface_email?email=${encodeURIComponent(email)}`, { headers: { 'x-interface-test-run': runId } })
  expect(r.status()).toBe(200)
  return await r.json() as { link?: string; codigo?: string }
}
export async function emailCode(request: APIRequestContext, email: string) {
  const { codigo } = await emailMessage(request, email)
  expect(codigo).toMatch(/^\d{6}$/)
  return codigo!
}
export async function confirmInBrowser(page: Page, email: string) {
  await expect(page.getByRole('heading', {name:'Digite o código.',exact:true})).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('rephouse-token'))).toBeNull()
  await page.getByLabel('Código do e-mail').fill(await emailCode(page.request, email))
  await page.getByRole('button', {name:'Confirmar código',exact:true}).click()
  await expect(page).toHaveURL(/\/republica(?:\?acao=(?:criar|entrar))?$/)
}
export async function registerByApi(request: APIRequestContext, input: {nome:string;email:string;senha:string}) {
  const r = await request.post(api + '/auth/register', {headers:{Origin:origin},data:input})
  expect(r.status()).toBe(202)
  expect(await r.json()).not.toHaveProperty('token')
  const { link } = await emailMessage(request, input.email)
  const proof = Object.fromEntries(new URLSearchParams(new URL(link!).hash.slice(1)))
  const confirmation = await request.post(api + '/auth/email/confirmar',{headers:{Origin:origin},data:proof})
  expect(confirmation.status()).toBe(200)
  return await confirmation.json() as components['schemas']['ConfirmacaoEmail']
}
