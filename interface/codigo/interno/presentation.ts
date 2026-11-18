// Compara datas civis em Brasília, sem converter vencimentos em horários locais.
export function brasilDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-')
}

export function financialState(due: string, remaining: number, paid: number, today = brasilDay(), serverState?: string) {
  if (serverState) {
    const states = { EM_DIA: { label: 'Em dia', tone: 'neutral' as const }, VENCE_EM_BREVE: { label: 'Vence em breve', tone: 'warning' as const }, VENCE_HOJE: { label: 'Vence hoje', tone: 'warning' as const }, ATRASADA: { label: 'Atrasada', tone: 'danger' as const }, QUITADA: { label: 'Paga', tone: 'success' as const } }
    if (serverState in states) return states[serverState as keyof typeof states]
  }
  if (remaining <= 0) return { label: 'Paga', tone: 'success' as const }
  if (due.slice(0, 10) < today) return { label: 'Vencida', tone: 'danger' as const }
  if (paid > 0) return { label: 'Parcial', tone: 'warning' as const }
  return { label: 'Pendente', tone: 'warning' as const }
}
