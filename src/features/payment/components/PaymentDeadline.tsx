import { Clock } from '@phosphor-icons/react'
import { paymentDateTime, paymentExpiry } from '../model/payment-lifecycle'
import { usePaymentClock } from '../hooks/usePaymentClock'
import '../styles/payment-lifecycle.css'

export function PaymentDeadline({ expiresAt, demo = false }: { expiresAt?: string; demo?: boolean }) {
  const now = usePaymentClock(expiresAt)
  const expiry = paymentExpiry(expiresAt)
  const remaining = expiry === null ? null : Math.max(0, Math.ceil((expiry - now) / 1000))
  return <div className={`nm-payment-deadline${remaining === 0 ? ' is-overdue' : ''}`}>
    <Clock size={18} aria-hidden="true" />
    <div>{remaining === null ? <strong>Chưa có thông tin thời hạn</strong> : remaining === 0 ? <><strong>Đã qua thời hạn thanh toán</strong><p>{demo ? 'Đây là giao dịch thử nghiệm. Trạng thái vẫn do hệ thống xác nhận.' : 'Cần kiểm tra trạng thái. Nếu đã chuyển tiền, vui lòng xác minh trước khi thanh toán lại.'}</p></> : <><strong>Còn <span className="nm-payment-deadline-clock">{Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}</span> để thanh toán</strong><p>Hạn thanh toán: {paymentDateTime(expiresAt)}</p></>}</div>
  </div>
}
