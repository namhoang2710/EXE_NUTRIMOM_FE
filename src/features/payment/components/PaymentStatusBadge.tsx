import { Check, Clock, X, Hourglass } from '@phosphor-icons/react'
import type { PaymentOrderStatus } from '../model/payment-types'
import { paymentStatusLabels } from '../model/payment-history'

export function PaymentStatusBadge({ status }: { status: PaymentOrderStatus }) {
  const Icon = status === 'PAID' ? Check : status === 'CANCELLED' ? X : status === 'EXPIRED' ? Hourglass : Clock
  return <span className={`nm-transaction-badge is-${status.toLowerCase()}`}><Icon size={14} weight="bold" aria-hidden="true" />{paymentStatusLabels[status]}</span>
}
