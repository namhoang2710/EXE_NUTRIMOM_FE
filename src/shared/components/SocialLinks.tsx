import { FacebookLogo, InstagramLogo, TiktokLogo } from '@phosphor-icons/react'
import { nutrimomSocialOrder, nutrimomSocials } from '../config/contact'
import '../styles/social-links.css'

const icons = { facebook: FacebookLogo, instagram: InstagramLogo, tiktok: TiktokLogo }

/** The same destinations and ordering are used by every public social surface. */
export function SocialLinks({ iconOnly = false, linkClassName = '' }: {
  iconOnly?: boolean
  linkClassName?: string
}) {
  return nutrimomSocialOrder.map((kind) => {
    const social = nutrimomSocials[kind], Icon = icons[kind]
    return <a key={kind} className={`nutrimom-social-link is-${kind} ${linkClassName}`.trim()}
      href={social.href} target="_blank" rel="noopener noreferrer"
      aria-label={`${social.ariaLabel} (mở trong tab mới)`} title={social.label}>
      <Icon size={19} weight={kind === 'instagram' ? 'bold' : 'fill'} aria-hidden="true" />
      {!iconOnly && <span className="social-link-label">{social.label}</span>}
    </a>
  })
}
