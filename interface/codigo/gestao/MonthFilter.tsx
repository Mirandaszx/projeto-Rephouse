// Navegadores sem campo de mês (ex.: Firefox) mostram um campo de texto com o placeholder;
// só nos que têm o campo nativo o texto sobreposto é necessário, senão aparece duplicado.
const monthSupported = (() => { const probe = document.createElement('input'); probe.setAttribute('type', 'month'); return probe.type === 'month' })()

/** Filtro de mês nativo (teclado e leitores de tela funcionam), sem o "--------- de ----" quando vazio. */
export function MonthFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  // O texto "Todos os meses" fica fora do <label>, para não entrar no nome acessível do campo.
  return <div className="month-filter" data-empty={!value && monthSupported ? '' : undefined}>
    <label>{label}<input type="month" value={value} placeholder="Todos os meses" onChange={event => onChange(event.target.value)} /></label>
    {!value && monthSupported && <span className="month-filter-empty" aria-hidden="true">Todos os meses</span>}
  </div>
}
