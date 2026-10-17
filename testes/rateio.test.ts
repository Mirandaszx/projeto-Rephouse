import test from 'node:test'
import assert from 'node:assert/strict'
import { dividirIgualmente } from '../codigo/modulos/financeiro/dominio/rateio.js'

function centavos(valor: string) {
  const [inteiro, decimal] = valor.split('.')
  return BigInt(inteiro) * 100n + BigInt(decimal)
}

test('divide a conta de R$ 120,00 igualmente entre três moradores', () => {
  assert.deepEqual(dividirIgualmente('120.00', ['a', 'b', 'c']), [
    { membroId: 'a', valorDevido: '40.00' },
    { membroId: 'b', valorDevido: '40.00' },
    { membroId: 'c', valorDevido: '40.00' },
  ])
})

test('distribui centavos restantes de forma determinística e conserva o total', () => {
  const membros = ['c', 'a', 'b']
  const rateios = dividirIgualmente('100.00', membros)
  assert.deepEqual(rateios, [
    { membroId: 'a', valorDevido: '33.34' },
    { membroId: 'b', valorDevido: '33.33' },
    { membroId: 'c', valorDevido: '33.33' },
  ])
  assert.deepEqual(membros, ['c', 'a', 'b'])
  assert.deepEqual(rateios, dividirIgualmente('100.00', ['b', 'c', 'a']))
  assert.equal(rateios.reduce((soma, rateio) => soma + centavos(rateio.valorDevido), 0n), 10000n)
})

test('não perde centavos em valores próximos ao limite NUMERIC(12,2)', () => {
  const rateios = dividirIgualmente('9999999999.99', ['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  const valores = rateios.map(rateio => centavos(rateio.valorDevido))
  assert.equal(valores.reduce((soma, valor) => soma + valor, 0n), 999999999999n)
  assert.ok(valores.every(valor => valor > 0n))
  assert.ok(valores.every(valor => valor >= valores[0] - 1n && valor <= valores[0]))
})

test('aceita inteiro, uma casa decimal e o mínimo de um centavo por morador', () => {
  assert.deepEqual(dividirIgualmente('3', ['a', 'b']), [
    { membroId: 'a', valorDevido: '1.50' },
    { membroId: 'b', valorDevido: '1.50' },
  ])
  assert.deepEqual(dividirIgualmente('0.3', ['a', 'b']), [
    { membroId: 'a', valorDevido: '0.15' },
    { membroId: 'b', valorDevido: '0.15' },
  ])
  assert.deepEqual(dividirIgualmente('0.03', ['a', 'b', 'c']), [
    { membroId: 'a', valorDevido: '0.01' },
    { membroId: 'b', valorDevido: '0.01' },
    { membroId: 'c', valorDevido: '0.01' },
  ])
})

test('rejeita valores ambíguos, inválidos, zero e precisão além de centavos', () => {
  for (const valor of [120, null, undefined, '', '0', '0.00', '-1.00', '1,20', '1.001', '1e2', ' 1.00', 'NaN', '10000000000.00']) {
    // Simula entrada externa que não passou pela tipagem/validação HTTP.
    assert.throws(() => dividirIgualmente(valor as unknown as string, ['a']), { name: 'Error' }, `valor: ${String(valor)}`)
  }
})

test('rejeita seleção vazia, duplicada e que produziria um rateio sem valor', () => {
  for (const membros of [null, [], ['a', 'a']]) {
    assert.throws(() => dividirIgualmente('1.00', membros as unknown as string[]))
  }
  assert.throws(() => dividirIgualmente('0.01', ['a', 'b']))
})
