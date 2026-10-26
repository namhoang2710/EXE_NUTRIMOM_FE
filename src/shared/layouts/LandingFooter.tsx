import {
  Clock,
  EnvelopeSimple,
  MapPin,
  Phone,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { nutrimomContact } from '../config/contact'
import { SocialLinks } from '../components/SocialLinks'
import { FooterReviews } from '@/features/reviews/components/FooterReviews'

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

        <FooterReviews />

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
          <SocialLinks />
        </div>
      </div>
      <div className="landing-footer-bottom">
        <span>© 2026 NutriMom. Mọi quyền được bảo lưu.</span>
        <span>All rights reserved. Designed by NutriDev</span>
      </div>
    </footer>
  )
}
