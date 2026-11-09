// Unlumen UI Animated List: https://ui.unlumen.com/components/animated-list
// Public registry source: https://ui.unlumen.com/r/animated-list.json
// RepHouse keeps the upstream spring and adds list semantics and reduced motion.
import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '../rebuild/vendor/cn'

type AnimationType = 'scale' | 'slide' | 'fade' | 'bounce'
type Props<T> = {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  maxVisible?: number
  gap?: number
  animation?: AnimationType
  className?: string
}

function getAnimationVariants(type: AnimationType) {
  switch (type) {
    case 'slide':
      return { initial: { opacity: 0, y: -30 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } }
    case 'fade':
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    case 'bounce':
      return { initial: { opacity: 0, y: -20, scale: 0.8 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, scale: 0.8 } }
    case 'scale':
    default:
      return { initial: { opacity: 0, y: -20, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, scale: 0.9 } }
  }
}

export function AnimatedList<T extends { id: string | number }>({ items, renderItem, maxVisible = 8, gap = 12, animation = 'scale', className }: Props<T>) {
  const reduced = useReducedMotion()
  const visible = items.slice(0, maxVisible)
  const variants = getAnimationVariants(animation)
  const spring = { type: 'spring' as const, stiffness: 350, damping: 28 }
  return <ul className={cn('relative flex flex-col', className)} style={{ gap }}>
    <AnimatePresence mode="popLayout" initial={false}>
      {visible.map((item, index) => <motion.li key={item.id} layout={!reduced}
        initial={reduced ? false : variants.initial} animate={reduced ? { opacity: 1 } : variants.animate}
        exit={reduced ? undefined : variants.exit} transition={reduced ? { duration: 0 } : { ...spring, layout: spring }}>
        {renderItem(item, index)}
      </motion.li>)}
    </AnimatePresence>
  </ul>
}
