import { EnvelopeSimple, InstagramLogo, MapPin, Phone } from '@phosphor-icons/react'
import { nutrimomContact, nutrimomSocials } from '../../../shared/config/contact'

interface FloatingContactActionsProps {
  visible: boolean
}

const contactActions = [
  {
    label: 'Gọi NutriMom',
    href: nutrimomContact.phone.href,
    className: 'is-phone',
    icon: <Phone size={22} weight="regular" aria-hidden="true" />,
  },
  {
    label: 'Theo dõi NutriMom trên Instagram',
    href: nutrimomSocials.instagram.href,
    className: 'is-instagram',
    icon: <InstagramLogo size={23} weight="bold" aria-hidden="true" />,
    external: true,
  },
  {
    label: 'Gửi email',
    href: nutrimomContact.email.href,
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
          rel={'external' in action && action.external ? 'noopener noreferrer' : undefined}
        >
          {action.icon}
        </a>
      ))}
    </nav>
  )
}
