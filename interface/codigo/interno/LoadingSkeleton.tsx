import { Skeleton } from '../rebuild/vendor/shadcn-skeleton'

/**
 * Blocos no formato da tela enquanto os dados chegam (shadcn Skeleton, 25/11/2026).
 * O texto continua no status para leitores de tela; os blocos são decorativos.
 */
export function PageSkeleton({ label, className }: { label: string; className?: string }) {
  return <div className={['rep-skeleton-page', className].filter(Boolean).join(' ')} role="status">
    <span className="visually-hidden">{label}</span>
    <Skeleton className="h-4 w-44" />
    <Skeleton className="h-10 w-72 max-w-full" />
    <Skeleton className="h-4 w-96 max-w-full" />
    <div className="rep-skeleton-cards">{[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-28 rounded-xl" />)}</div>
    <Skeleton className="h-52 rounded-xl" />
  </div>
}

export function ListSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return <div className="rep-skeleton-list" role="status">
    <span className="visually-hidden">{label}</span>
    {Array.from({ length: rows }, (_, row) => <div key={row} className="rep-skeleton-row">
      <Skeleton className="size-10 rounded-full" />
      <div><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3.5 w-2/5" /></div>
      <Skeleton className="h-10 w-32 rounded-full" />
    </div>)}
  </div>
}
