// Adapted from shadcn/ui registry/bases/base/ui/skeleton.tsx (MIT).
// RepHouse: o pulso só roda sem "movimento reduzido" (motion-safe), e o bloco é decorativo (aria-hidden).
import type { ComponentProps } from 'react'
import { cn } from './cn'

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn('rounded-md bg-muted motion-safe:animate-pulse', className)} {...props} />
}

export { Skeleton }
