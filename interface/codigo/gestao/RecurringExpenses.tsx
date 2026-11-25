import ErrorNotice from '../interno/ErrorNotice'
import type { Feedback } from '../interno/feedback'
import { useEffect, useId, useState } from 'react'
import { apiRequest, brl, request } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import MemberPicker from '../rebuild/MemberPicker'
import ActionDialog from './ActionDialog'
import { errorFeedback, type Member, type Schemas } from './types'
import './financial.css'
import { Badge } from '../interno/WorkspaceUI'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../rebuild/vendor/shadcn-collapsible'

type Recurring = Schemas['Recorrencia']
const nextMonth = (month: string) => {
  const value = new Date(`${month}-01T00:00:00Z`)
  value.setUTCMonth(value.getUTCMonth() + 1)
  return value.toISOString().slice(0, 7)
}
export function RecurrenceFields({ today, due = '', origin = false }: { today: string; due?: string; origin?: boolean }) {
  const [enabled, setEnabled] = useState(false)
  const [start, setStart] = useState<{ suggested: string; value: string } | null>(null)
  const current = today.slice(0, 7)
  const earliest = origin ? nextMonth(current > due.slice(0, 7) ? current : due.slice(0, 7)) : current
  const suggested = origin ? earliest : due && due < today ? nextMonth(current) : due.slice(0, 7) || current
  const startMonth = start?.suggested === suggested ? start.value : suggested
  return <div className="finance-recurring-fields"><label className="finance-check"><input type="checkbox" name="repetir" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Repetir mensalmente</label>
    {enabled && <><label>Primeiro mês de vencimento<input type="month" name="inicio" required min={earliest} max="2199-12" value={startMonth} onChange={event => setStart({ suggested, value: event.target.value })} /></label>
      <RecurrenceEndField earliest={`${startMonth || earliest}-01`} />
      <p>Os mesmos moradores participarão dos próximos meses. Dias 29, 30 e 31 usam o último dia válido do mês. Contas anteriores permanecem preservadas.</p></>}
  </div>
}

export function RecurrenceEndField({ earliest, value }: { earliest: string; value?: string | null }) {
  const hint = useId()
  return <div className="finance-recurring-end"><label>Repetir até (opcional)<input type="date" name="fim" min={earliest} max="2199-12-31" defaultValue={value ?? ''} aria-describedby={hint} /></label>
    <p id={hint}>Dia, mês e ano do último vencimento permitido. Deixe em branco para repetir sem prazo. As contas já geradas não serão alteradas.</p>
  </div>
}

export default function RecurringExpenses({ token, members, revision, canManage, onChanged, onCreate }: { token: string; members: Member[]; revision: number; canManage: boolean; onChanged: () => void; onCreate: () => void }) {
  const [items, setItems] = useState<Recurring[] | null>(null)
  const [error, setError] = useState<Feedback>('')
  const [attempt, setAttempt] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState<Recurring | null>(null)
  const [total, setTotal] = useState('')
  const [selected, setSelected] = useState<Recurring | null>(null)
  const [periods, setPeriods] = useState<Record<string, Schemas['CompetenciaRecorrencia'][]>>({})
  const [periodErrors, setPeriodErrors] = useState<Record<string, Feedback>>({})
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [disable, setDisable] = useState<Recurring | null>(null)
  useEffect(() => {
    let active = true
    request<Recurring[]>('/recorrencias', token).then(async value => {
      if (!active) return
      setItems(value); setError(''); setPeriods({}); setPeriodErrors({})
      let cursor = 0
      // O contrato atual consulta os meses por recorrência. Limitar a concorrência
      // evita disparar uma requisição para cada item ao mesmo tempo.
      await Promise.all(Array.from({ length: Math.min(4, value.length) }, async () => {
        while (active && cursor < value.length) {
          const item = value[cursor++]
          try {
            const months = await request<Schemas['CompetenciaRecorrencia'][]>(`/recorrencias/${item.id}/competencias`, token)
            if (active) setPeriods(previous => ({ ...previous, [item.id]: months }))
          } catch (failure) {
            if (active) setPeriodErrors(previous => ({ ...previous, [item.id]: errorFeedback(failure) }))
          }
        }
      }))
    }).catch(failure => { if (active) setError(errorFeedback(failure)) })
    return () => { active = false }
  }, [token, revision, attempt])
  const needsReview = (item: Recurring) => Boolean(item.ativa && item.pausaMotivo) || periods[item.id]?.some(month => month.estado === 'BLOQUEADA' || month.estado === 'PENDENTE_REVISAO')
  const attention = items?.filter(needsReview).length ?? 0
  const checking = !error && (!items || items.some(item => !periods[item.id] && !periodErrors[item.id]))
  const occurrences = selected ? periods[selected.id] : undefined
  return <section className="finance-recurring" aria-label="Contas recorrentes">
    {attention > 0 && <div className="finance-recurring-attention" role="status"><p><strong>{attention === 1 ? 'Uma recorrência precisa de revisão.' : `${attention} recorrências precisam de revisão.`}</strong> Confira pausas e meses não gerados antes de cadastrar cobranças.</p><GlisseButton variant="secondary" onClick={() => setExpanded(true)}>Conferir recorrências</GlisseButton></div>}
    {error && <><ErrorNotice error={error} /><GlisseButton variant="secondary" onClick={() => { setError(''); setAttempt(value => value + 1) }}>Tentar carregar recorrências</GlisseButton></>}
    {Object.keys(periodErrors).length > 0 && <div><p role="alert">Não foi possível conferir todos os meses das recorrências.</p><GlisseButton variant="secondary" onClick={() => setAttempt(value => value + 1)}>Tentar conferir meses</GlisseButton></div>}
    <Collapsible open={expanded} onOpenChange={setExpanded}><CollapsibleTrigger className="finance-recurring-trigger"><ChevronDown size={18} aria-hidden="true" />Contas recorrentes{attention > 0 && <Badge tone="warning">{attention} para revisar</Badge>}</CollapsibleTrigger><CollapsibleContent keepMounted className="finance-recurring-panel">
    <p>Configurações mensais e meses que precisam de revisão.</p>
    {checking && <p role="status">Conferindo recorrências e meses…</p>}
    {items?.length === 0 && <p>Nenhuma recorrência configurada. Use “Repetir mensalmente” ao cadastrar uma despesa.</p>}
    {items?.map(item => <article className="finance-recurring-row" key={item.id}><div><h3>{item.configuracoes[0].titulo}</h3><p>{brl.format(Number(item.configuracoes[0].valorTotal))} · Dia {item.configuracoes[0].diaVencimento} · {item.ativa ? item.pausaMotivo ? 'Geração pausada para revisão' : 'Ativa' : 'Desativada'}</p><small>{item.fim ? `Até ${item.fim.split('-').reverse().join('/')} · ` : 'Sem prazo de término · '}Configuração a partir de {item.configuracoes[0].vigencia.split('-').reverse().join('/')} · Próximo mês: {item.proximaCompetencia.split('-').reverse().join('/')}</small>{needsReview(item) && <div><Badge tone="warning">Revisão necessária</Badge></div>}</div><div className="finance-actions"><GlisseButton variant="secondary" onClick={() => setSelected(item)}>Ver meses</GlisseButton>{canManage && <><GlisseButton variant="secondary" onClick={() => { setTotal(item.configuracoes[0].valorTotal); setEditing(item) }}>Editar recorrência</GlisseButton>{item.ativa && <GlisseButton variant="secondary" onClick={() => setDisable(item)}>Desativar</GlisseButton>}</>}</div></article>)}
    {selected && <section aria-label="Meses da recorrência"><h3>{selected.configuracoes[0].titulo} por mês</h3>{periodErrors[selected.id] ? <ErrorNotice error={periodErrors[selected.id]} /> : !occurrences ? <p role="status">Carregando meses…</p> : !occurrences.length ? <p>O primeiro mês ainda não foi processado.</p> : occurrences.map(item => <div className="finance-recurring-row" key={item.competencia}><p>{item.competencia.split('-').reverse().join('/')} · {({ GERADA: 'Conta gerada', PENDENTE_REVISAO: 'Mês não gerado: revise antes de cobrar', BLOQUEADA: 'Geração interrompida: confira participantes e administração', REVISADA: 'Revisada pelo administrador' })[item.estado]}</p>{canManage && ['PENDENTE_REVISAO','BLOQUEADA'].includes(item.estado) && <div className="finance-actions"><GlisseButton variant="secondary" onClick={onCreate}>Cadastrar conta avulsa</GlisseButton><GlisseButton variant="secondary" onClick={() => setReviewing(item.competencia)}>Marcar como revisada</GlisseButton></div>}</div>)}</section>}
    {reviewing && selected && <ActionDialog title="Revisar mês" confirm="Confirmar revisão" onClose={() => setReviewing(null)} onSubmit={async () => { await request(`/recorrencias/${selected.id}/competencias/${reviewing}/revisar`, token, {}); onChanged() }}><p>Confira se é necessário cadastrar uma conta avulsa para {reviewing.split('-').reverse().join('/')}. Marcar a revisão não cria cobranças e não altera saldos.</p></ActionDialog>}
    {disable && <ActionDialog title="Desativar recorrência" confirm="Desativar recorrência" onClose={() => setDisable(null)} onSubmit={async () => { await apiRequest('PATCH', `/recorrencias/${disable.id}`, token, { ativa: false }); onChanged() }}><p>Novas contas deixarão de ser geradas. Despesas e pagamentos anteriores continuam disponíveis.</p></ActionDialog>}
    {editing && <ActionDialog title="Editar recorrência mensal" confirm="Salvar recorrência" onClose={() => setEditing(null)} onSubmit={async data => {
      const membroIds = data.getAll('membroIds').map(String)
      if (!membroIds.length) throw new Error('Selecione pelo menos um morador ativo.')
      await apiRequest('PATCH', `/recorrencias/${editing.id}`, token, { titulo: String(data.get('titulo')), categoria: String(data.get('categoria')), valorTotal: String(data.get('valorTotal')), diaVencimento: Number(data.get('diaVencimento')), ...(editing.fim !== undefined || data.get('fim') ? { fim: String(data.get('fim') || '') || null } : {}), membroIds, ativa: data.get('ativa') === 'on' })
      onChanged()
    }}><p>Valor, participantes e dia de vencimento mudam a partir do próximo mês. A data de término limita as próximas gerações. Contas já geradas não serão modificadas. Revise separadamente os meses não gerados.</p>
      <label>Descrição<input name="titulo" required maxLength={160} defaultValue={editing.configuracoes[0].titulo} /></label><label>Categoria<input name="categoria" required maxLength={80} defaultValue={editing.configuracoes[0].categoria} /></label><label>Valor total (R$)<input name="valorTotal" type="number" required min="0.01" max="9999999999.99" step="0.01" defaultValue={editing.configuracoes[0].valorTotal} onChange={event => setTotal(event.target.value)} /></label><label>Dia de vencimento<input name="diaVencimento" type="number" required min="1" max="31" defaultValue={editing.configuracoes[0].diaVencimento} /></label>
      <MemberPicker members={members} initialSelected={editing.configuracoes[0].membroIds} total={total} /><label className="finance-check"><input name="ativa" type="checkbox" defaultChecked={editing.ativa} />Manter ativa e retomar a geração após a revisão</label>
      <RecurrenceEndField earliest={`${editing.inicio}-01`} value={editing.fim} />
    </ActionDialog>}
  </CollapsibleContent></Collapsible></section>
}
