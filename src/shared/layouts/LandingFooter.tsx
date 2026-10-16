import {
  Clock,
  EnvelopeSimple,
  FacebookLogo,
  InstagramLogo,
  MapPin,
  Phone,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { nutrimomContact, nutrimomSocials } from '../config/contact'
import { landingNavigation } from './landing-navigation'

export function LandingFooter() {
  return (
    <footer className="landing-footer" id="site-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <Link className="landing-brand" to="/" aria-label="NutriMom, về trang chủ">
            <img src="/nutrimom-logo.png" width="46" height="46" alt="" />
            <span>NutriMom</span>
          </Link>
          <p>Chăm sóc bằng sự thấu hiểu.</p>
        </div>

        <div className="landing-footer-column">
          <h2>Quick Links</h2>
          {landingNavigation.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
        </div>

        <div className="landing-footer-column">
          <h2>Kết nối</h2>
          <a className="landing-footer-contact" href={nutrimomContact.phone.href}>
            <Phone size={17} weight="duotone" aria-hidden="true" />
            <span>{nutrimomContact.phone.label}</span>
          </a>
          <a className="landing-footer-contact" href={nutrimomContact.email.href}>
            <EnvelopeSimple size={17} weight="duotone" aria-hidden="true" />
            <span>{nutrimomContact.email.label}</span>
          </a>
          <span className="landing-footer-contact">
            <MapPin size={17} weight="duotone" aria-hidden="true" />
            <span>{nutrimomContact.office}</span>
          </span>
          <span className="landing-footer-contact">
            <Clock size={17} weight="duotone" aria-hidden="true" />
            <span>{nutrimomContact.supportHours}</span>
          </span>
        </div>

        <div className="landing-footer-column landing-footer-socials">
          <h2>Follow Us</h2>
          <a
            href={nutrimomSocials.facebook.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={nutrimomSocials.facebook.ariaLabel}
          >
            <FacebookLogo size={18} weight="fill" aria-hidden="true" />
            <span>{nutrimomSocials.facebook.label}</span>
          </a>
          <a
            href={nutrimomSocials.instagram.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={nutrimomSocials.instagram.ariaLabel}
          >
            <InstagramLogo size={18} weight="bold" aria-hidden="true" />
            <span>{nutrimomSocials.instagram.label}</span>
          </a>
        </div>
      </div>
      <div className="landing-footer-bottom">
        <span>© 2026 NutriMom. Mọi quyền được bảo lưu.</span>
        <span>All rights reserved. Designed by NutriDev</span>
        <span>Chăm sóc bằng sự thấu hiểu.</span>
      </div>
    </footer>
  )
}
