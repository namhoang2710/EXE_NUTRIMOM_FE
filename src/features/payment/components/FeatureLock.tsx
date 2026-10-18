import { ArrowRight, LockKey } from '@phosphor-icons/react'
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { UpgradeHint } from '../model/entitlement-types'
import { upgradeDestination } from '../model/upgrade-hint'
import { ResourceFeedback } from './ResourceFeedback'
import '../styles/feature-lock.css'

interface Props {
  locked: boolean
  label: string
  hint: UpgradeHint | null
  children: ReactNode
  description?: string
  compact?: boolean
  pending?: boolean
  error?: Error | null
  retryAt?: number
  onRetry?: () => Promise<unknown>
  className?: string
}

/** Keep the feature's layout visible, but exclude locked controls from input and accessibility. */
export function FeatureLock({ locked, label, hint, children, description, compact = false, pending = false, error, retryAt = 0, onRetry, className = '' }: Props) {
  const id = useId()
  const blocked = locked || pending || Boolean(error)
  return <div className={`nm-feature-lock${blocked ? ' is-locked' : ''}${compact ? ' is-compact' : ''} ${className}`}>
    <div className="nm-feature-lock__preview" inert={blocked} aria-hidden={blocked || undefined}>{children}</div>
    {blocked && <section className="nm-feature-lock__glass" aria-labelledby={error ? undefined : id} aria-label={error ? `${label}: quyền sử dụng` : undefined}>
      {pending ? <p id={id} className="nm-feature-lock__pending" role="status">Đang kiểm tra quyền sử dụng…</p>
        : error && onRetry ? <ResourceFeedback error={error} retryAt={retryAt} onRetry={onRetry} label="quyền sử dụng" />
          : <div className="nm-feature-lock__notice">
            <span className="nm-feature-lock__icon"><LockKey size={24} weight="duotone" aria-hidden="true" /></span>
            <h3 id={id}>{hint?.message || `${label} thuộc quyền lợi của gói trả phí.`}</h3>
            {description && <p>{description}</p>}
            <Link className="nm-feature-lock__link" to={hint ? upgradeDestination(hint) : '/app/pricing#pricing'}>Xem gói phù hợp<ArrowRight size={16} aria-hidden="true" /></Link>
          </div>}
    </section>}
  </div>
}
