import type { ReactNode } from 'react'
import { House } from 'lucide-react'
import PhotoAvatar from '../perfil/PhotoAvatar'
import type { PhotoMetadata } from '../perfil/photo-cache'

export function WorkspaceBrand({ href = '/republica' }: { href?: string }) {
  return <a className="rep-brand workspace-brand" href={href} aria-label="RepHouse, início"><span><House size={21} strokeWidth={1.7} aria-hidden="true" /></span>RepHouse<span className="workspace-brand-dot" aria-hidden="true">.</span></a>
}

export function PageHeading({ title, context, description, children }: { title: string; context?: string; description?: string; children?: ReactNode }) {
  return <header className="rep-intro workspace-heading"><div>{context && <p className="workspace-eyebrow">{context}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="workspace-heading-actions">{children}</div>}</header>
}

export function SectionHeading({ id, title, description, children }: { id?: string; title: string; description?: string; children?: ReactNode }) {
  return <div className="workspace-section-heading"><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div>{children}</div>
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return <span className="workspace-badge" data-tone={tone}>{children}</span>
}

export function PersonMark(props: { name: string; userId?: string; token?: string; photo?: PhotoMetadata | null; context?: string }) {
  return <PhotoAvatar {...props} />
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="workspace-empty"><p>{title}</p>{description && <small>{description}</small>}</div>
}
