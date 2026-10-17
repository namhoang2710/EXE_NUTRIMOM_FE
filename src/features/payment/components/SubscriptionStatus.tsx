import { useRetryCountdown } from '../hooks/usePaymentCooldown'
import { ArrowRight, ArrowClockwise, Crown, Leaf, WarningCircle } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useEntitlements } from '../hooks/useEntitlements'
import { ResourceFeedback } from './ResourceFeedback'
import '../styles/entitlements.css'

export function SubscriptionStatus({ compact = false, showLink = true }: { compact?: boolean; showLink?: boolean }) {
  const state = useEntitlements()
  const retrySeconds = useRetryCountdown(state.retryAt)
  const subscription = state.subscription
  const Icon = subscription?.paid ? Crown : Leaf
  return <section className={`nm-subscription-status${compact ? ' is-compact' : ''}`} aria-label="Gói của bạn">
    {state.loading && !subscription ? <div className="nm-subscription-skeleton" role="status">Đang tải gói của bạn…</div> : subscription ? <>
      <span className="nm-subscription-status__icon"><Icon size={compact ? 22 : 30} weight="duotone" aria-hidden="true" /></span>
      <div className="nm-subscription-status__copy"><span>Gói của bạn</span><strong>{subscription.plan_name}</strong>
        <p>{subscription.paid && subscription.end_date ? `Có hiệu lực đến ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(subscription.end_date))}` : 'Bắt đầu với những công cụ thiết yếu.'}</p>
        {state.error && <small><WarningCircle size={14} /> Chưa cập nhật được. <button type="button" disabled={state.loading || retrySeconds > 0} onClick={() => void state.reload().catch(() => undefined)}>{retrySeconds > 0 ? `Thử lại sau ${retrySeconds}s` : 'Thử lại'}</button></small>}
      </div>
      {subscription.paid && <span className="nm-subscription-status__remaining">{subscription.days_remaining > 0 ? `Còn ${subscription.days_remaining} ngày` : 'Sắp hết hạn'}</span>}
      {showLink && <Link className="nm-subscription-status__link" to="/app/pricing#pricing">{subscription.paid ? 'Xem quyền lợi' : 'Nâng cấp'}<ArrowRight size={16} aria-hidden="true" /></Link>}
    </> : <ResourceFeedback error={state.error} retryAt={state.retryAt} onRetry={state.reload} label="thông tin gói" />}
    {subscription && !compact && <button className="nm-subscription-status__refresh" type="button" disabled={state.loading || retrySeconds > 0} aria-label="Cập nhật gói của bạn" onClick={() => void state.reload().catch(() => undefined)}><ArrowClockwise size={17} /></button>}
  </section>
}
