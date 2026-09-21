import { Link } from 'react-router-dom'
import { landingNavigation } from './landing-navigation'

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <Link className="landing-brand" to="/">
            <img src="/nutrimom-logo.png" width="46" height="46" alt="" />
            <span>NutriMom</span>
          </Link>
          <p>Đồng hành cùng mẹ trên hành trình chăm sóc sức khỏe và nuôi dưỡng những khởi đầu bình an.</p>
        </div>

        <div className="landing-footer-column">
          <h2>Khám phá</h2>
          {landingNavigation.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
        </div>

        <div className="landing-footer-column">
          <h2>Kết nối</h2>
          <a href="tel:19001234">1900 1234</a>
          <a href="mailto:hello@nutrimom.vn">hello@nutrimom.vn</a>
          <span>Thứ Hai – Thứ Bảy, 08:00–20:00</span>
        </div>
      </div>
      <div className="landing-footer-bottom">
        <span>© 2026 NutriMom. Mọi quyền được bảo lưu.</span>
        <span>Chăm sóc bằng sự thấu hiểu.</span>
      </div>
    </footer>
  )
}
