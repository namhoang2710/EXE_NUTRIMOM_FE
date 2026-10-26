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
            href={nutrimomSocials.tiktok.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={nutrimomSocials.tiktok.ariaLabel}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.28 6.28 0 0 0 1.86-4.47V8.78a8.18 8.18 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.86-.21z" />
            </svg>
            <span>{nutrimomSocials.tiktok.label}</span>
          </a>
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
