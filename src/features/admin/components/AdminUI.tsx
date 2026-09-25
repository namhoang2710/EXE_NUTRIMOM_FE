import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
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
  const normalized = value.toUpperCase().replaceAll(' ', '_')
  const tone = ['ACTIVE', 'CONFIRMED', 'COMPLETED', 'READY', 'PUBLISHED', 'ON_TRACK'].includes(normalized)
    ? 'positive'
    : ['LOCKED', 'DISABLED', 'SUSPENDED', 'CANCELLED', 'HIGH', 'REVIEW_REQUIRED', 'NEEDS_ATTENTION', 'ARCHIVED'].includes(normalized)
      ? 'negative'
      : ['PENDING', 'SCHEDULED', 'PROCESSING', 'REVIEW', 'MEDIUM', 'IN_PROGRESS', 'PROFILE_REQUIRED', 'CONTEXT_REQUIRED', 'DRAFT'].includes(normalized)
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

const paginationNumber = new Intl.NumberFormat()

const defaultPaginationLabels = {
  rows: 'Số dòng',
  previous: 'Trước',
  next: 'Sau',
  nav: 'Phân trang',
  summary: (from: string, to: string, total: string, noun: string) => `Hiển thị ${from}–${to} trong ${total} ${noun}`,
  page: (current: number, last: number) => `Trang ${current} / ${last}`,
}

export type TablePaginationLabels = Partial<typeof defaultPaginationLabels>

/**
 * Chân bảng có khoảng đang xem + chọn số dòng + điều hướng trang.
 * Tách từ markup inline của AdminUsersPage; nhãn mặc định tiếng Việt, ghi đè qua `labels`
 * cho những trang còn dùng tiếng Anh.
 */
export function TablePagination({ page, pageSize, totalItems, totalPages, pageSizes, busy = false, itemNoun = 'mục', labels, onPageChange, onPageSizeChange }: {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  pageSizes: readonly number[]
  busy?: boolean
  itemNoun?: string
  labels?: TablePaginationLabels
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const text = { ...defaultPaginationLabels, ...labels }
  const lastPage = Math.max(1, totalPages)
  const firstShown = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const lastShown = Math.min(page * pageSize, totalItems)

  return (
    <footer className="admin-table-pagination">
      <span>{text.summary(paginationNumber.format(firstShown), paginationNumber.format(lastShown), paginationNumber.format(totalItems), itemNoun)}</span>
      <label>{text.rows} <select value={pageSize} disabled={busy} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
        {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
      </select></label>
      <nav aria-label={text.nav}>
        <button type="button" disabled={busy || page <= 1} onClick={() => onPageChange(page - 1)}><ArrowLeft size={16} />{text.previous}</button>
        <span>{text.page(page, lastPage)}</span>
        <button type="button" disabled={busy || page >= lastPage} onClick={() => onPageChange(page + 1)}>{text.next}<ArrowRight size={16} /></button>
      </nav>
    </footer>
  )
}
