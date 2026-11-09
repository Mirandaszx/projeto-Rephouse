import { WordsStagger } from './vendor/spell-words-stagger'

export default function AnimatedTitle({ children, className }: { children: string; className?: string }) {
  return <h1 className={className} aria-label={children}>
    <span aria-hidden="true"><WordsStagger key={children} className="!inline" stagger={0.065} speed={0.32}>{children}</WordsStagger></span>
  </h1>
}
