import { useContext, useEffect, useMemo, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { AdminLoginRevealContext } from '../hooks/admin-login-reveal-context'

/** Reveal each dashboard block once in the credential-login run, including late API data. */
export function AdminLoginReveal({ id, index, children, className = '' }: { id: string; index: number; children: ReactNode; className?: string }) {
  const { startedAt, seen } = useContext(AdminLoginRevealContext)
  const reducedMotion = useReducedMotion()
  const run = useMemo(() => {
    if (startedAt === null) return { animate: false, delay: 0 }
    const contentStart = window.matchMedia('(max-width:1020px)').matches ? 900 : 3400
    return { animate: !seen.has(id), delay: Math.max(0, (contentStart - (performance.now() - startedAt)) / 1000) + index * .09 }
  }, [startedAt, seen, id, index])
  useEffect(() => { if (run.animate) seen.add(id) }, [id, seen, run.animate])
  return <motion.div key={startedAt ?? 'restored'} className={`admin-login-reveal ${className}`} data-admin-reveal={id} initial={run.animate && !reducedMotion ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : .48, delay: reducedMotion ? 0 : run.delay, ease: [.4, 0, .2, 1] }}>{children}</motion.div>
}
