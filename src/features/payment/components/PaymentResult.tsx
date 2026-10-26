import { formatVietnamDate } from '@/core/date-time/vietnam'
import { ArrowCounterClockwise, ArrowLeft, ArrowRight, CheckCircle, CircleNotch, Clock, Receipt, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getSessionScope } from '@/core/auth/token-store'
import { paymentApi, invalidatePaymentHistory } from '../api/payment-api'
import { primeSubscriptionCache } from '../hooks/useSubscription'
import { loadPaymentOutcome, refreshPaidSubscription } from '../model/payment-outcome'
import { subscriptionCoversOrder } from '../model/payment-lifecycle'
import { usePaymentCooldown } from '../hooks/usePaymentCooldown'
import { PaymentDeadline } from './PaymentDeadline'
import { formatPaymentAmount, parseOrderCode } from '../model/subscription-plans'
import type { PaymentOrderResponse, SubscriptionResponse } from '../model/payment-types'
import { PaymentSteps } from './PaymentSteps'
import '../styles/payment.css'

const paymentStatusPollDelays = [1500, 2500, 4000, 6000] as const

function formatDate(value: string) {
  return formatVietnamDate(value) || 'Chưa có thông tin'
}

export function PaymentResult({ cancelled = false }: { cancelled?: boolean }) {
  const { user } = useAuth()
  return <PaymentResultContent key={`${getSessionScope()}:${user?.id}`} cancelled={cancelled} />
}

function PaymentResultContent({ cancelled }: { cancelled: boolean }) {
  const [params] = useSearchParams()
  const code = parseOrderCode(params.get('orderCode'))
  const [state, setState] = useState<{ order: PaymentOrderResponse | null; subscription: SubscriptionResponse | null; loading: boolean; error: string | null }>({ order: null, subscription: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)
  const cooldown = usePaymentCooldown('payment-history')
  const cooldownRef = useRef(cooldown)
  cooldownRef.current = cooldown
  const notified = useRef(false)

  useEffect(() => { notified.current = false }, [code])

  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [code])

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    setState({ order: null, subscription: null, loading: true, error: null })
    async function check(poll = 0, verifiedPaidOrder: PaymentOrderResponse | null = null) {
      if (!code) {
        if (active) setState({ order: null, subscription: null, loading: false, error: 'Đường dẫn chưa có mã đơn hợp lệ. Vui lòng quay lại Bảng giá hoặc liên hệ hỗ trợ.' })
        return
      }
      try {
        if (cooldownRef.current.blocked) {
          if (active) setState((old) => ({ ...old, loading: false, error: 'Vui lòng chờ trước khi kiểm tra lại trạng thái.' }))
          return
        }
        const result = verifiedPaidOrder
          ? await refreshPaidSubscription(verifiedPaidOrder, paymentApi)
          : await loadPaymentOutcome(code, paymentApi)
        if (!active) return
        if (result.order.status === 'PAID') invalidatePaymentHistory()
        const ready = subscriptionCoversOrder(result.subscription, result.order.plan_tier)
        if (ready && result.subscription && !notified.current) {
          notified.current = true
          primeSubscriptionCache(result.subscription)
          window.dispatchEvent(new CustomEvent('nutrimom:subscription-changed'))
        }
        const needsSync = (result.order.status === 'PENDING' && !cancelled) || (result.order.status === 'PAID' && !ready)
        const keepPolling = needsSync && poll < paymentStatusPollDelays.length
        setState({ ...result, loading: keepPolling, error: null })
        if (keepPolling) {
          const nextVerifiedOrder = result.order.status === 'PAID' ? result.order : null
          timer = setTimeout(
            () => void check(poll + 1, nextVerifiedOrder),
            paymentStatusPollDelays[poll],
          )
        }
      } catch (requestError) {
        cooldownRef.current.handleRateLimit(requestError)
        if (active) setState((current) => ({ ...current, loading: false, error: requestError instanceof Error ? requestError.message : 'Chưa thể kiểm tra trạng thái thanh toán.' }))
      }
    }
    void check()
    return () => { active = false; clearTimeout(timer) }
  }, [code, cancelled, attempt])

  const { order, subscription, loading, error } = state
  const paid = order?.status === 'PAID'
  const ready = paid && subscriptionCoversOrder(subscription, order.plan_tier)
  const stopped = order?.status === 'CANCELLED' || order?.status === 'EXPIRED'
  const title = paid ? ready ? 'Gói của mẹ đã sẵn sàng.' : 'Đã xác nhận thanh toán.' : loading ? 'Đang kiểm tra thanh toán…' : error ? 'Chưa thể xác minh giao dịch.' : order?.status === 'CANCELLED' ? 'Đơn thanh toán đã được hủy.' : order?.status === 'EXPIRED' ? 'Đơn thanh toán đã hết hạn.' : 'Đang chờ thanh toán.'
  const description = paid ? ready ? 'Cảm ơn mẹ đã đồng hành. Quyền lợi của gói đã được cập nhật trên tài khoản.' : 'Đơn đã được thanh toán. Thông tin gói đang được cập nhật, bạn có thể kiểm tra lại.' : loading ? 'NutriMom đang kiểm tra trạng thái đơn từ hệ thống thanh toán.' : stopped || cancelled ? 'Bạn có thể quay lại chọn gói khi sẵn sàng. Nếu đã chuyển tiền, hãy kiểm tra trạng thái trước khi thanh toán lại.' : 'Hệ thống chưa xác nhận đơn đã thanh toán. Nếu vừa chuyển tiền, hãy kiểm tra lại sau ít phút.'
  const Icon = paid ? CheckCircle : loading ? CircleNotch : error ? WarningCircle : Clock

  return (
    <main className="nm-payment-result-page">
      <Link className="nm-payment-result-brand" to="/app"><img src="/nutrimom-logo.png" alt="" width="34" height="34" />NutriMom</Link>
      <div className="nm-payment-result-content">
        <span className={`nm-payment-result-icon${paid ? ' is-paid' : ''}`}><Icon size={38} weight={paid ? 'fill' : 'regular'} className={loading && !paid ? 'nm-payment-spinner' : ''} aria-hidden="true" /></span>
        <span className="nm-payment-kicker">{paid ? 'Thanh toán được xác nhận' : 'Trạng thái giao dịch'}</span>
        <div role="status" aria-live="polite"><h1>{title}</h1><p className="nm-payment-result-description">{description}</p></div>
        <PaymentSteps current={3} />
        {order && <dl className="nm-payment-result-receipt">
          <div><dt>Mã đơn</dt><dd>#{order.order_code}</dd></div>
          <div><dt>Gói dịch vụ</dt><dd>{order.plan_name}</dd></div>
          <div><dt>{paid ? 'Đã thanh toán' : 'Giá trị đơn'}</dt><dd>{formatPaymentAmount(order.amount)}</dd></div>
          <div><dt>Trạng thái đơn</dt><dd className={paid ? 'nm-payment-success-color' : ''}>{paid ? 'Đã thanh toán' : order.status === 'EXPIRED' ? 'Đã hết hạn' : order.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ thanh toán'}</dd></div>
          {ready && subscription?.end_date && <div><dt>Gói có hiệu lực đến</dt><dd>{formatDate(subscription.end_date)}</dd></div>}
        </dl>}
        {error && <div className="nm-payment-notice nm-payment-notice--error" role="alert"><WarningCircle size={21} /><div><strong>Thông tin chưa được xác nhận</strong><p>{error}</p></div></div>}
        {order?.status === 'PENDING' && <PaymentDeadline expiresAt={order.expires_at} demo={order.source === 'DEMO'} />}
        <div className="nm-payment-result-actions">
          {ready ? <Link className="nm-payment-primary" to="/app">Vào không gian của bạn<ArrowRight size={18} /></Link> : <button className="nm-payment-primary" onClick={() => setAttempt((value) => value + 1)} disabled={loading || !code || cooldown.blocked}>{loading ? <CircleNotch size={18} className="nm-payment-spinner" /> : <ArrowCounterClockwise size={18} />}{loading ? 'Đang kiểm tra…' : cooldown.remaining ? `Thử lại sau ${cooldown.remaining}s` : 'Kiểm tra lại trạng thái'}</button>}
          <Link className="nm-payment-result-secondary" to={paid ? '/app/profile' : `/app/pricing${order ? `?plan=${order.plan_tier}` : ''}#pricing`}>{paid ? <Receipt size={17} /> : <ArrowLeft size={17} />}{paid ? 'Quản lý tài khoản' : 'Quay lại Bảng giá'}</Link>
          <Link className="nm-payment-result-secondary" to="/app/payment-history"><Receipt size={17} />Lịch sử giao dịch</Link>
          <Link className="nm-payment-help" to="/app/profile/support">Liên hệ hỗ trợ NutriMom</Link>
        </div>
      </div>
    </main>
  )
}
