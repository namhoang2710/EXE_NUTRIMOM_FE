import { ArrowCounterClockwise, ArrowLeft, ArrowRight, CheckCircle, CircleNotch, Clock, Receipt, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { paymentApi } from '../api/payment-api'
import { loadPaymentOutcome } from '../model/payment-outcome'
import { formatPaymentAmount, parseOrderCode } from '../model/subscription-plans'
import type { PaymentOrderResponse, SubscriptionResponse } from '../model/payment-types'
import { PaymentSteps } from './PaymentSteps'
import '../styles/payment.css'

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Chưa có thông tin' : date.toLocaleDateString('vi-VN')
}

export function PaymentResult({ cancelled = false }: { cancelled?: boolean }) {
  const [params] = useSearchParams()
  const code = parseOrderCode(params.get('orderCode'))
  const [state, setState] = useState<{ order: PaymentOrderResponse | null; subscription: SubscriptionResponse | null; loading: boolean; error: string | null }>({ order: null, subscription: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)

  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [code])

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    setState({ order: null, subscription: null, loading: true, error: null })
    async function check(poll = 0) {
      if (!code) {
        if (active) setState({ order: null, subscription: null, loading: false, error: 'Đường dẫn chưa có mã đơn hợp lệ. Vui lòng quay lại Bảng giá hoặc liên hệ hỗ trợ.' })
        return
      }
      try {
        const result = await loadPaymentOutcome(code, paymentApi)
        if (!active) return
        const ready = result.subscription?.active && result.subscription.plan_tier === result.order.plan_tier
        const needsSync = (result.order.status === 'PENDING' && !cancelled) || (result.order.status === 'PAID' && !ready)
        const keepPolling = needsSync && poll < 4
        setState({ ...result, loading: keepPolling, error: null })
        if (keepPolling) timer = setTimeout(() => void check(poll + 1), 2000)
      } catch (requestError) {
        if (active) setState((current) => ({ ...current, loading: false, error: requestError instanceof Error ? requestError.message : 'Chưa thể kiểm tra trạng thái thanh toán.' }))
      }
    }
    void check()
    return () => { active = false; clearTimeout(timer) }
  }, [code, cancelled, attempt])

  const { order, subscription, loading, error } = state
  const paid = order?.status === 'PAID'
  const ready = paid && subscription?.active && subscription.plan_tier === order.plan_tier
  const stopped = order?.status === 'CANCELLED' || order?.status === 'EXPIRED'
  const title = paid ? ready ? 'Gói của mẹ đã sẵn sàng.' : 'Đã xác nhận thanh toán.' : loading ? 'Đang kiểm tra thanh toán…' : error ? 'Chưa thể xác minh giao dịch.' : stopped || cancelled ? 'Thanh toán chưa hoàn tất.' : 'Đang chờ thanh toán.'
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
          {ready && subscription.end_date && <div><dt>Gói có hiệu lực đến</dt><dd>{formatDate(subscription.end_date)}</dd></div>}
        </dl>}
        {error && <div className="nm-payment-notice nm-payment-notice--error" role="alert"><WarningCircle size={21} /><div><strong>Thông tin chưa được xác nhận</strong><p>{error}</p></div></div>}
        <div className="nm-payment-result-actions">
          {ready ? <Link className="nm-payment-primary" to="/app">Vào không gian của bạn<ArrowRight size={18} /></Link> : <button className="nm-payment-primary" onClick={() => setAttempt((value) => value + 1)} disabled={loading || !code}>{loading ? <CircleNotch size={18} className="nm-payment-spinner" /> : <ArrowCounterClockwise size={18} />}{loading ? 'Đang kiểm tra…' : 'Kiểm tra lại trạng thái'}</button>}
          <Link className="nm-payment-result-secondary" to={paid ? '/app/profile' : `/app/pricing${order ? `?plan=${order.plan_tier}` : ''}#pricing`}>{paid ? <Receipt size={17} /> : <ArrowLeft size={17} />}{paid ? 'Quản lý tài khoản' : 'Quay lại Bảng giá'}</Link>
          <Link className="nm-payment-help" to="/app/profile/support">Liên hệ hỗ trợ NutriMom</Link>
        </div>
      </div>
    </main>
  )
}
