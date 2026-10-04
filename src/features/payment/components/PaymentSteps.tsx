import { Check } from '@phosphor-icons/react'

export function PaymentSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="nm-payment-steps" aria-label="Quy trình thanh toán">
      {['Chọn gói', 'Xác nhận', 'Thanh toán'].map((label, index) => (
        <li key={label} className={index + 1 <= current ? 'is-reached' : ''} aria-current={index + 1 === current ? 'step' : undefined}>
          <span>{index + 1 < current ? <Check size={15} weight="bold" aria-hidden="true" /> : index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  )
}
