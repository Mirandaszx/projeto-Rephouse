import { brl } from '../api'

type Participant = { id: string; usuario: { nome: string } }

export default function RateioPreview({ total, participants }: { total: string; participants: Participant[] }) {
  const valid = /^\d{1,10}(\.\d{1,2})?$/.test(total)
  const [whole, decimal = ''] = valid ? total.split('.') : ['0']
  const cents = BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0'))
  const count = BigInt(participants.length)
  const ready = valid && count > 0n && cents >= count
  // Mesma regra do rateio: centavos inteiros e resto distribuído pela ordem dos IDs.
  // Esta conferência não substitui a validação do backend ao salvar.
  const amounts = new Map(ready ? participants.map(person => person.id).sort().map((id, index) =>
    [id, cents / count + (BigInt(index) < cents % count ? 1n : 0n)] as const) : [])
  return <section className="finance-split-preview" aria-label="Conferência do rateio">
    <h3>Confira a divisão</h3>
    {!participants.length ? <p>Selecione pelo menos um morador para dividir a despesa.</p> : <>
      <p>{ready ? 'Veja quanto ficará para cada pessoa antes de salvar.' : 'Informe um valor válido para conferir a parte de cada pessoa.'}</p>
      <ul>{participants.map(person => <li key={person.id}><span>{person.usuario.nome}</span><strong>{ready ? brl.format(Number(amounts.get(person.id)!) / 100) : '—'}</strong></li>)}</ul>
      {valid && cents > 0n && cents < count && <p role="status">O valor precisa permitir pelo menos R$ 0,01 por morador.</p>}
      {ready && <p className="finance-split-total">Total da despesa <strong>{brl.format(Number(cents) / 100)}</strong></p>}
      {ready && cents % count !== 0n && <p>Os centavos restantes são distribuídos entre os participantes.</p>}
    </>}
  </section>
}
