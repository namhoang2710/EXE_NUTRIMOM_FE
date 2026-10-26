import { ArrowClockwise, ArrowUpRight, Receipt } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { ApiClientError } from '@/core/api/api-error'
import { getSessionScope } from '@/core/auth/token-store'
import { paymentApi } from '../api/payment-api'
import { usePaymentCooldown } from '../hooks/usePaymentCooldown'
import { usePaymentClock } from '../hooks/usePaymentClock'
import { primeSubscriptionCache } from '../hooks/useSubscription'
import { canResumePayment, paymentDateTime, safePayOSUrl } from '../model/payment-lifecycle'
import { formatPaymentAmount } from '../model/subscription-plans'
import type { PaymentOrderResponse, PaymentOrderStatus } from '../model/payment-types'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import { PaymentDeadline } from './PaymentDeadline'

const sourceLabels = { REAL: 'Thanh toán qua PayOS', DEMO: 'Giao dịch thử nghiệm', LEGACY_UNKNOWN: 'Ghi nhận gói · nguồn chưa xác định' }
type Operation = 'read' | 'resume' | 'cancel'

export function PaymentOrderDetail({ code, initialStatus, onClose, onUpdated }: {
  code: number; initialStatus?: PaymentOrderStatus; onClose: () => void; onUpdated: (order: PaymentOrderResponse) => void
}) {
  const scope = getSessionScope()
  const [order, setOrder] = useState<PaymentOrderResponse | null>(null)
  const [operation, setOperation] = useState<Operation | null>('read')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const sequence = useRef(0)
  const busy = useRef(true)
  const paidNotified = useRef(initialStatus === 'PAID')
  const keepButton = useRef<HTMLButtonElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const cooldown = usePaymentCooldown('payment-history')
  const current = useRef({ cooldown, onUpdated })
  current.current = { cooldown, onUpdated }
  const now = usePaymentClock(order?.status === 'PENDING' ? order.expires_at : undefined)

  function publish(next: PaymentOrderResponse) {
    setOrder(next)
    current.current.onUpdated(next)
    if (next.status === 'PAID' && !paidNotified.current) {
      paidNotified.current = true
      void paymentApi.getMySubscription().then((subscription) => {
        if (getSessionScope() === scope) primeSubscriptionCache(subscription)
      }).catch(() => undefined).finally(() => {
        if (getSessionScope() === scope) window.dispatchEvent(new CustomEvent('nutrimom:subscription-changed'))
      })
    }
  }

  function report(reason: unknown) {
    current.current.cooldown.handleRateLimit(reason)
    setError(reason instanceof ApiClientError && reason.code === 'PAYMENT_ORDER_NOT_FOUND'
      ? 'Không tìm thấy giao dịch này trong tài khoản của bạn.'
      : reason instanceof ApiClientError && reason.code === 'PAYMENT_FAILED'
        ? 'Chưa hủy được đơn thanh toán. Trạng thái chưa được thay đổi; bạn có thể kiểm tra lại.'
        : reason instanceof Error ? reason.message : 'Chưa thể kiểm tra giao dịch.')
  }

  useEffect(() => {
    const id = ++sequence.current
    busy.current = true
    if (current.current.cooldown.blocked) {
      setOperation(null)
      busy.current = false
      setError('Vui lòng chờ trước khi kiểm tra lại giao dịch.')
    } else {
      paymentApi.getOrderDetails(code).then((next) => {
        if (id === sequence.current && scope === getSessionScope()) publish(next)
      }).catch((reason: unknown) => {
        if (id === sequence.current && scope === getSessionScope()) report(reason)
      }).finally(() => {
        if (id === sequence.current && scope === getSessionScope()) { busy.current = false; setOperation(null) }
      })
    }
    return () => { sequence.current += 1 }
    // The callbacks read current refs; opening the panel makes one shared read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, scope])

  useEffect(() => { if (confirming) keepButton.current?.focus() }, [confirming])

  async function perform(kind: Operation) {
    if (busy.current || cooldown.blocked) return
    busy.current = true
    setOperation(kind)
    setError(null)
    setNotice(null)
    const id = ++sequence.current
    const valid = () => id === sequence.current && scope === getSessionScope()
    try {
      const next = kind === 'cancel' ? await paymentApi.cancelOrder(code) : await paymentApi.getOrderDetails(code)
      if (!valid()) return
      publish(next)
      setConfirming(false)
      if (kind === 'cancel') setNotice(next.status === 'CANCELLED' ? 'Đơn thanh toán đã được hủy.' : next.status === 'EXPIRED' ? 'Đơn đã hết hạn thanh toán.' : 'Trạng thái giao dịch đã được cập nhật.')
      if (kind === 'resume') {
        if (canResumePayment(next)) window.location.assign(safePayOSUrl(next.checkout_url)!)
        else setNotice('Đơn không còn đủ điều kiện mở lại thanh toán. Vui lòng xem trạng thái vừa cập nhật.')
      }
    } catch (reason) {
      if (!valid()) return
      if (reason instanceof ApiClientError && reason.code === 'PAYMENT_ORDER_NOT_CANCELLABLE') {
        setConfirming(false)
        setNotice('Đơn có thể đã được thanh toán nên không thể hủy. Hệ thống đang kiểm tra lại trạng thái.')
        try {
          const latest = await paymentApi.getOrderDetails(code)
          if (valid()) publish(latest)
        } catch (readError) { if (valid()) report(readError) }
      } else report(reason)
    } finally {
      if (valid()) { busy.current = false; setOperation(null) }
    }
  }

  const blocked = operation !== null || cooldown.blocked
  return <AccessibleDialog open title="Chi tiết giao dịch" description={`Đơn #${code}`} busy={operation === 'cancel'} onClose={() => { if (operation !== 'cancel') onClose() }} className="nm-history-dialog">
    {operation === 'read' && <p className="nm-history-message" role="status">Đang kiểm tra giao dịch…</p>}
    {error && <p className="nm-history-error" role="alert">{error}</p>}
    {notice && <p className="nm-history-notice" role="status">{notice}</p>}
    {order && <>
      <div className="nm-history-detail-top"><Receipt size={28} weight="duotone" aria-hidden="true" /><PaymentStatusBadge status={order.status} /></div>
      <h3 className="nm-history-detail-plan">{order.plan_name}</h3><p className="nm-history-detail-amount">{formatPaymentAmount(order.amount)}</p>
      <dl className="nm-history-details">
        <div><dt>Mã đơn</dt><dd>#{order.order_code}</dd></div>
        <div><dt>Nguồn ghi nhận</dt><dd>{sourceLabels[order.source]}</dd></div>
        <div><dt>Ngày tạo</dt><dd>{paymentDateTime(order.created_at)}</dd></div>
        <div><dt>Thanh toán lúc</dt><dd>{paymentDateTime(order.paid_at)}</dd></div>
        <div><dt>Cập nhật lúc</dt><dd>{paymentDateTime(order.updated_at)}</dd></div>
        {order.description && <div><dt>Nội dung</dt><dd>{order.description}</dd></div>}
      </dl>
      {order.status === 'PENDING' && <><PaymentDeadline expiresAt={order.expires_at} demo={order.source === 'DEMO'} /><p className="nm-history-note">Trạng thái phản ánh thông tin hệ thống đang ghi nhận. Nếu vừa chuyển tiền, hãy kiểm tra trước khi thanh toán lại.</p></>}
    </>}
    {confirming ? <section className="nm-history-cancel-confirm" aria-labelledby="nm-cancel-order-title">
      <h4 id="nm-cancel-order-title">Hủy đơn thanh toán này?</h4>
      <p>Nếu đã chuyển tiền, hãy giữ đơn và kiểm tra trạng thái trước. Việc hủy không phải là yêu cầu hoàn tiền.</p>
      <div className="nm-history-detail-actions"><button ref={keepButton} className="nm-history-button is-secondary" type="button" disabled={operation !== null} onClick={() => { setConfirming(false); cancelButton.current?.focus() }}>Giữ đơn</button><button className="nm-history-button is-danger" type="button" disabled={blocked} onClick={() => void perform('cancel')}>{operation === 'cancel' ? 'Đang hủy…' : 'Xác nhận hủy đơn'}</button></div>
    </section> : <div className="nm-history-detail-actions">
      {order && canResumePayment(order, now) && <button className="nm-history-button" type="button" disabled={blocked} onClick={() => void perform('resume')}>{operation === 'resume' ? 'Đang kiểm tra…' : 'Tiếp tục thanh toán'}<ArrowUpRight size={16} aria-hidden="true" /></button>}
      <button className="nm-history-button is-secondary" type="button" disabled={blocked} onClick={() => void perform('read')}><ArrowClockwise size={16} aria-hidden="true" />{cooldown.remaining ? `Thử lại sau ${cooldown.remaining}s` : 'Kiểm tra trạng thái'}</button>
      {order?.status === 'PENDING' && <button ref={cancelButton} className="nm-history-cancel-link" type="button" disabled={blocked} onClick={() => setConfirming(true)}>Hủy đơn</button>}
    </div>}
  </AccessibleDialog>
}
