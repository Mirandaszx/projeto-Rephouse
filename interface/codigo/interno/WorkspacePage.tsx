import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/** Entrada da página pronta: sem animar a lateral ou cada linha financeira. */
export function WorkspacePage({ children, animate, focus }: { children: ReactNode; animate: boolean; focus: boolean }) {
  const reduced = useReducedMotion()
  const content = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (focus) content.current?.closest('main')?.focus({ preventScroll: true })
  }, [focus])
  return <motion.div ref={content} className="workspace-page"
    initial={!animate || reduced ? false : { opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: reduced || !animate ? 0 : .2, ease: [.23, 1, .32, 1] }}>
    {children}
  </motion.div>
}
