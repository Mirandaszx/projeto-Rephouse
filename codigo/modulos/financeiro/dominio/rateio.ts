export interface ParcelaRateio {
  membroId: string
  valorDevido: string
}

// Usa centavos inteiros; não arredonda dinheiro em ponto flutuante.
export function dividirIgualmente(valorTotal: string, membroIds: readonly string[]): ParcelaRateio[] {
  if (typeof valorTotal !== 'string' || !/^\d{1,10}(\.\d{1,2})?$/.test(valorTotal)) {
    throw new Error('Informe o valor como string decimal positiva, com até duas casas.')
  }
  if (!Array.isArray(membroIds) || membroIds.length === 0 || new Set(membroIds).size !== membroIds.length) {
    throw new Error('Selecione pelo menos um membro, sem repetições.')
  }
  const [inteiro, decimal = ''] = valorTotal.split('.')
  const centavos = BigInt(inteiro) * 100n + BigInt(decimal.padEnd(2, '0'))
  const quantidade = BigInt(membroIds.length)
  if (centavos < quantidade) throw new Error('Cada membro deve receber ao menos R$ 0,01.')
  const base = centavos / quantidade
  const resto = centavos % quantidade

  return [...membroIds].sort().map((membroId, indice) => {
    const valor = base + (BigInt(indice) < resto ? 1n : 0n)
    return { membroId, valorDevido: `${valor / 100n}.${String(valor % 100n).padStart(2, '0')}` }
  })
}
