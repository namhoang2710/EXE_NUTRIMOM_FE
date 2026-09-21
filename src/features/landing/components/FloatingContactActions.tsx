import { EnvelopeSimple, MapPin, Phone } from '@phosphor-icons/react'

interface FloatingContactActionsProps {
  visible: boolean
}

const contactActions = [
  {
    label: 'Gọi NutriMom',
    href: 'tel:19001234',
    className: 'is-phone',
    icon: <Phone size={22} weight="regular" aria-hidden="true" />,
  },
  {
    label: 'Nhắn Zalo',
    href: 'https://zalo.me/19001234',
    className: 'is-zalo',
    icon: <span className="floating-contact-zalo-mark" aria-hidden="true">Zalo</span>,
    external: true,
  },
  {
    label: 'Gửi email',
    href: 'mailto:hello@nutrimom.vn',
    className: 'is-email',
    icon: <EnvelopeSimple size={23} weight="regular" aria-hidden="true" />,
  },
  {
    label: 'Xem thông tin văn phòng',
    href: '/contact',
    className: 'is-location',
    icon: <MapPin size={23} weight="regular" aria-hidden="true" />,
  },
] as const

export function FloatingContactActions({ visible }: FloatingContactActionsProps) {
  return (
    <nav
      className={`floating-contact-actions${visible ? ' is-visible' : ''}`}
      aria-label="Liên hệ nhanh"
      aria-hidden={!visible}
    >
      {contactActions.map((action) => (
        <a
          className={`floating-contact-action ${action.className}`}
          href={action.href}
          key={action.label}
          title={action.label}
          aria-label={action.label}
          tabIndex={visible ? 0 : -1}
          target={'external' in action && action.external ? '_blank' : undefined}
          rel={'external' in action && action.external ? 'noreferrer' : undefined}
        >
          {action.icon}
        </a>
      ))}
    </nav>
  )
}
