import { useEffect, useRef, useState } from 'react'
import { apiRequest, brl, request } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import ActionDialog from './ActionDialog'
import Payments from './Payments'
import type { PersonalShare } from './types'
import { balance, civilDate, errorMessage } from './types'
import { Badge, EmptyState, SectionHeading } from '../interno/WorkspaceUI'
import { financialState } from '../interno/presentation'

export default function PersonalFinance({ token, currentHouseId }: { token: string; currentHouseId?: string }) {
  const [items, setItems] = useState<PersonalShare[] | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [paying, setPaying] = useState<PersonalShare | null>(null)
  const paymentKey = useRef('')
  useEffect(() => {
    let active = true
    request<PersonalShare[]>('/me/financeiro', token).then(data => { if (active) { setItems(data); setError('') } }).catch(failure => { if (active) setError(errorMessage(failure)) })
    return () => { active = false }
  }, [token, revision])
  // Agrupa somente a coleção retornada, preservando os IDs e o histórico original.
  const houses = new Map<string, { name: string; items: PersonalShare[] }>()
  for (const share of items ?? []) {
    const house = share.despesa.republica
    const group = houses.get(house.id) ?? { name: house.nome, items: [] }
    group.items.push(share)
    houses.set(house.id, group)
  }
  const totalPaid = (items ?? []).reduce((sum, share) => sum + Math.round(Number(share.valorPago) * 100), 0) / 100
  const totalBalance = (items ?? []).reduce((sum, share) => sum + Math.round(balance(share) * 100), 0) / 100
  return <div className="rep-management">
    {items && <section className="workspace-finance-summary" aria-label="Resumo do seu financeiro"><div><span>Seu saldo em aberto</span><strong>{brl.format(totalBalance)}</strong></div><div><span>Pagamentos registrados</span><strong>{brl.format(totalPaid)}</strong></div><div><span>Repúblicas no histórico</span><strong>{houses.size}</strong></div></section>}
    <section className="rep-management-card workspace-finance-history"><SectionHeading title="Seu histórico financeiro" description="Suas partes, pagamentos e comprovantes de cada república." />
      {error && <><p role="alert" className="rep-action-error">{error}</p><GlisseButton variant="secondary" onClick={() => setRevision(value => value + 1)}>Tentar carregar financeiro</GlisseButton></>}
      {!items && !error && <p role="status">Carregando seu financeiro…</p>}
      {items?.length === 0 && <EmptyState title="Nenhuma despesa no seu histórico." />}
      {Array.from(houses, ([id, group]) => <section className="workspace-house-history" key={id} aria-label={`Histórico de ${group.name}`}><div className="workspace-house-history-heading"><h3>{group.name}</h3><Badge tone={id === currentHouseId ? 'success' : 'neutral'}>{id === currentHouseId ? 'República atual' : 'Vínculo anterior'}</Badge></div><ul className="rep-management-list">{group.items.map(share => {
        const state = financialState(share.despesa.vencimento, balance(share), Number(share.valorPago))
        return <li key={share.id}><div className="rep-management-row"><div><h4>{share.despesa.titulo}</h4><small>{share.despesa.categoria} · Vence em {civilDate(share.despesa.vencimento)}</small></div><Badge tone={state.tone}>{state.label}</Badge></div>
        <div className="rep-management-summary"><span>Sua parte: <strong>{brl.format(Number(share.valorDevido))}</strong></span><span>Pago: <strong>{brl.format(Number(share.valorPago))}</strong></span><span>Saldo: <strong>{brl.format(balance(share))}</strong></span></div>
        <Payments payments={share.pagamentos} token={token} />
        {balance(share) > 0 && <div><GlisseButton variant="secondary" onClick={() => { paymentKey.current = crypto.randomUUID(); setPaying(share) }}>Registrar pagamento desta parte</GlisseButton></div>}
      </li>})}</ul></section>)}
    </section>
    {paying && <ActionDialog title="Pagar parte do histórico" confirm="Registrar pagamento" onClose={() => setPaying(null)} onSubmit={async data => {
      const file = data.get('comprovante')
      if (file instanceof File && file.name && file.size === 0) throw new Error('O comprovante está vazio. Escolha outro arquivo ou remova-o.')
      if (file instanceof File && file.size > 0 && (file.size > 5 * 1024 * 1024 || !/\.(pdf|png|jpe?g|webp)$/i.test(file.name))) throw new Error('Selecione um PDF ou imagem válida de até 5 MB.')
      if (!(file instanceof File) || file.size === 0) data.delete('comprovante')
      data.set('rateioId', paying.id)
      await apiRequest('POST', '/pagamentos', token, data, { 'Idempotency-Key': paymentKey.current })
      setRevision(value => value + 1)
    }}>
      <p>{paying.despesa.titulo} · {paying.despesa.republica.nome}. Saldo: {brl.format(balance(paying))}.</p>
      <div onChange={() => { paymentKey.current = crypto.randomUUID() }} className="rep-management-form">
        <label>Valor pago (R$)<input name="valor" type="number" required min="0.01" step="0.01" max={balance(paying)} defaultValue={balance(paying).toFixed(2)} /></label>
        <label>Comprovante opcional<input name="comprovante" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" /></label><small>PDF, PNG, JPEG ou WebP · até 5 MiB.</small>
      </div>
    </ActionDialog>}
  </div>
}
