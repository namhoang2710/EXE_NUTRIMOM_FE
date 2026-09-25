import type { ContactRequestStatus } from '../model/contact-dto'
import { contactStatusLabel, contactStatusTone } from '../model/contact-labels'

interface ContactStatusBadgeProps {
  value: ContactRequestStatus
  /** `admin` dùng lại `.admin-badge` của admin.css; `user` dùng `.nm-contact-badge` của contact.css. */
  variant?: 'admin' | 'user'
}

/**
 * `StatusBadge` của AdminUI in ra chính giá trị enum bằng tiếng Anh nên không dùng lại được,
 * nhưng bảng tone của nó khớp hoàn toàn nên phần CSS vẫn được tái sử dụng.
 */
export function ContactStatusBadge({ value, variant = 'user' }: ContactStatusBadgeProps) {
  const tone = contactStatusTone(value)
  const className = variant === 'admin' ? `admin-badge admin-contact-badge ${tone}` : `nm-contact-badge ${tone}`
  return <span className={className}>{contactStatusLabel(value)}</span>
}
