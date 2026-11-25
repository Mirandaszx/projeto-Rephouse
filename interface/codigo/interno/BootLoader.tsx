import { House } from 'lucide-react'

/**
 * Tela de abertura enquanto o RepHouse carrega (25/11/2026): a casinha da marca "respira" devagar.
 * Com movimento reduzido ela só clareia e escurece, sem sair do lugar. Estilos em index.css.
 */
export function BootLoader({ label = 'Carregando RepHouse…' }: { label?: string }) {
  return <div className="rep-boot" role="status">
    <span className="rep-boot-mark" aria-hidden="true"><House size={32} strokeWidth={1.7} /></span>
    <p className="rep-boot-text">{label}</p>
  </div>
}
