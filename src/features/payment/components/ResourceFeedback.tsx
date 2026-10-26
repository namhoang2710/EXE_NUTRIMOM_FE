import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react'
import { useRetryCountdown } from '../hooks/usePaymentCooldown'

export function ResourceFeedback({ error, retryAt, onRetry, label = 'bảng giá' }: { error: Error | null; retryAt: number; onRetry: () => Promise<unknown>; label?: string }) {
  const remaining = useRetryCountdown(retryAt)
  return <div className="nm-pricing-feedback" role="alert"><WarningCircle size={24} aria-hidden="true" /><div><strong>Chưa tải được {label}</strong><p>{error?.message ?? 'Vui lòng thử lại để xem thông tin mới nhất.'}</p></div><button className="secondary-button" type="button" disabled={remaining > 0} onClick={() => void onRetry().catch(() => undefined)}><ArrowClockwise size={16} aria-hidden="true" />{remaining > 0 ? `Thử lại sau ${remaining}s` : 'Thử lại'}</button></div>
}

export function PricingSkeleton() {
  return <div className="nm-pricing-skeleton" role="status" aria-label="Đang tải bảng giá">{[0, 1, 2].map((item) => <div key={item}><span /><span /><span /><span /></div>)}</div>
}
