import { ArrowRight, LockKey, ShieldCheck } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import type { UpgradeHint } from '../model/entitlement-types'
import { upgradeDestination } from '../model/upgrade-hint'
import '../styles/entitlements.css'

export function UpgradePrompt({ hint, onDismiss }: { hint: UpgradeHint; onDismiss?: () => void }) {
  const reduceMotion = useReducedMotion()
  const action = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    // Let the dialog capture its original opener before moving focus to new content.
    const frame = window.requestAnimationFrame(() => action.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [])
  return <motion.section className="nm-upgrade-prompt" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }} aria-label="Quyền lợi theo gói">
    <span className="nm-upgrade-prompt__icon"><LockKey size={26} weight="duotone" aria-hidden="true" /></span>
    <h3>Thêm quyền lợi cho hành trình của mẹ</h3>
    <p>{hint.message}</p>
    <div className="nm-upgrade-prompt__actions">
      <Link ref={action} className="nm-payment-primary" to={upgradeDestination(hint)}>Xem gói phù hợp <ArrowRight size={18} aria-hidden="true" /></Link>
      {onDismiss && <button className="secondary-button" type="button" onClick={onDismiss}>Để sau</button>}
    </div>
    <small><ShieldCheck size={16} aria-hidden="true" /> Dữ liệu đã có của bạn vẫn được giữ nguyên.</small>
  </motion.section>
}

export function UpgradeDialog({ hint, onClose }: { hint: UpgradeHint | null; onClose: () => void }) {
  return <AccessibleDialog open={Boolean(hint)} title="Mở quyền lợi này" onClose={onClose} className="nm-upgrade-dialog">
    {hint && <UpgradePrompt hint={hint} onDismiss={onClose} />}
  </AccessibleDialog>
}
