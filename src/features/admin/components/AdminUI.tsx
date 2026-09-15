import {
  ArrowClockwise,
  CalendarCheck,
  ChatCircleText,
  CurrencyCircleDollar,
  Heartbeat,
  Tray,
  TrendDown,
  TrendUp,
  UsersThree,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { AdminMetric } from '../model/admin-types'

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toUpperCase()
  const tone = ['ACTIVE', 'CONFIRMED', 'COMPLETED', 'READY', 'PUBLISHED', 'ON_TRACK'].includes(normalized)
    ? 'positive'
    : ['SUSPENDED', 'CANCELLED', 'HIGH', 'REVIEW_REQUIRED', 'NEEDS_ATTENTION', 'ARCHIVED'].includes(normalized)
      ? 'negative'
      : ['PENDING', 'SCHEDULED', 'PROCESSING', 'REVIEW', 'MEDIUM', 'IN_PROGRESS', 'DRAFT'].includes(normalized)
        ? 'warning'
        : 'neutral'
  return <span className={`admin-badge ${tone}`}>{value.replaceAll('_', ' ')}</span>
}

const metricIcons = {
  users: UsersThree,
  appointments: CalendarCheck,
  consultations: ChatCircleText,
  alerts: Heartbeat,
  revenue: CurrencyCircleDollar,
}

export function MetricCard({ metric }: { metric: AdminMetric }) {
  const Icon = metricIcons[metric.icon]
  const TrendIcon = metric.trend === 'down' ? TrendDown : TrendUp
  return (
    <article className={`admin-metric-card metric-${metric.icon}`}>
      <div className="admin-metric-heading">
        <span>{metric.label}</span>
        <span className="admin-metric-icon"><Icon size={21} weight="duotone" /></span>
      </div>
      <strong className="admin-metric-value">{metric.value}</strong>
      <div className="admin-metric-foot">
        <span className={`admin-trend ${metric.trend}`}><TrendIcon size={14} weight="bold" />{metric.change}</span>
        <span>{metric.helper}</span>
      </div>
    </article>
  )
}

export function PageHeading({ eyebrow, title, description, actions }: {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="admin-page-heading">
      <div>
        {eyebrow && <p>{eyebrow}</p>}
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {actions && <div className="admin-heading-actions">{actions}</div>}
    </div>
  )
}

export function TableCard({ title, description, action, children }: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="admin-card admin-table-card">
      <div className="admin-card-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ResourceState({ status, empty, error, onRetry, children }: {
  status: 'loading' | 'success' | 'error'
  empty: boolean
  error: string | null
  onRetry: () => void
  children: ReactNode
}) {
  if (status === 'loading') {
    return (
      <div className="admin-loading" aria-label="Loading data">
        <span /><span /><span /><span />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="admin-state">
        <span className="admin-state-icon error"><ArrowClockwise size={24} /></span>
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button className="admin-button secondary" type="button" onClick={onRetry}><ArrowClockwise size={17} />Try again</button>
      </div>
    )
  }
  if (empty) {
    return (
      <div className="admin-state">
        <span className="admin-state-icon"><Tray size={25} /></span>
        <h3>No records found</h3>
        <p>New records will appear here when they become available.</p>
      </div>
    )
  }
  return children
}
