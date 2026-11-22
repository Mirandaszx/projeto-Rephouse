import { expect, type APIRequestContext, type Page } from '@playwright/test'
import type { components } from '../../../integracao/api'

const api = 'http://127.0.0.1:3405/api'
const origin = 'http://127.0.0.1:5174'
export async function emailLink(request: APIRequestContext, email: string) {
  const runId = process.env.REPHOUSE_INTERFACE_TEST_RUN
  if (!runId) throw new Error('Execute pelo harness de interface isolado.')
  const r = await request.get(`http://127.0.0.1:3405/__interface_email?email=${encodeURIComponent(email)}`, { headers: { 'x-interface-test-run': runId } })
  expect(r.status()).toBe(200)
  return (await r.json() as {link:string}).link
}
export async function confirmInBrowser(page: Page, email: string) {
  await expect(page.getByRole('heading', {name:'Confira seu e-mail.',exact:true})).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('rephouse-token'))).toBeNull()
  const link = await emailLink(page.request, email)
  await page.goto(link)
  await expect(page).toHaveURL(/\/confirmar-email$/)
  await page.getByRole('button', {name:'Confirmar e entrar',exact:true}).click()
  await expect(page).toHaveURL(/\/republica(?:\?acao=(?:criar|entrar))?$/)
}
export async function registerByApi(request: APIRequestContext, input: {nome:string;email:string;senha:string}) {
  const r = await request.post(api + '/auth/register', {headers:{Origin:origin},data:input})
  expect(r.status()).toBe(202)
  expect(await r.json()).not.toHaveProperty('token')
  const link = new URL(await emailLink(request,input.email)), proof = Object.fromEntries(new URLSearchParams(link.hash.slice(1)))
  const confirmation = await request.post(api + '/auth/email/confirmar',{headers:{Origin:origin},data:proof})
  expect(confirmation.status()).toBe(200)
  return await confirmation.json() as components['schemas']['ConfirmacaoEmail']
}
