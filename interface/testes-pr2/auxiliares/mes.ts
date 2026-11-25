import { expect, type Page } from '@playwright/test'

export const nomesDosMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export const filtroDeMes = (page: Page) => page.getByRole('button', { name: /^Mês do vencimento/ })

/** Escolhe "AAAA-MM" no seletor de mês e ano, como uma pessoa faria: abre, anda nos anos e toca no mês. */
export async function escolherMes(page: Page, competencia: string) {
  const [ano, mes] = competencia.split('-').map(Number)
  await filtroDeMes(page).click()
  const seletor = page.getByRole('dialog', { name: 'Escolher mês e ano', exact: true })
  const mostrado = seletor.locator('.month-filter-year strong')
  for (let atual = Number(await mostrado.textContent()); atual !== ano; atual = Number(await mostrado.textContent())) {
    await seletor.getByRole('button', { name: atual > ano ? 'Ano anterior' : 'Próximo ano', exact: true }).click()
    await expect(mostrado).not.toHaveText(String(atual))
  }
  await seletor.getByRole('button', { name: `${nomesDosMeses[mes - 1]} de ${ano}`, exact: true }).click()
  await expect(seletor).toBeHidden()
}
