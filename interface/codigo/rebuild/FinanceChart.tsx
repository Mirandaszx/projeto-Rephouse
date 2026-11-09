import { useReducedMotion } from 'motion/react'
import { Chart } from './vendor/spell-chart'
import { brl } from '../api'

export type FinancePoint = { mes: string; valor: number }
export default function FinanceChart({ points }: { points?: FinancePoint[] }) {
  const reduced = useReducedMotion()
  return <section className="rh-finance-chart" aria-labelledby="finance-chart-title">
    <header><div><h2 id="finance-chart-title">Pagamentos registrados</h2><p>Distribuição mensal dos registros</p></div>{points?.length ? <span>Exemplo ilustrativo</span> : null}</header>
    {points && points.length > 1 ? <>
      <div aria-hidden="true"><Chart data={points.map(point => point.valor)} labels={points.map(point => point.mes)} color="#28634c" name="Pagamentos" formatValue={value => brl.format(value)} width={1200} animated={!reduced} /></div>
      <details><summary>Consultar valores do gráfico</summary><dl>{points.map(point => <div key={point.mes}><dt>{point.mes}</dt><dd>{brl.format(point.valor)}</dd></div>)}</dl></details>
    </> : <p>O histórico mensal estará disponível quando houver dados para este gráfico.</p>}
  </section>
}
