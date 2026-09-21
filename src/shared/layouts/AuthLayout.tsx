import { Heart, House, ShieldCheck } from '@phosphor-icons/react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'

interface AuthLayoutProps extends PropsWithChildren {
  title: string
  subtitle: string
  footer?: ReactNode
  panelVariant?: 'login' | 'register'
  showHomeLink?: boolean
}

const panelContent = {
  login: {
    eyebrow: 'Đồng hành cùng thai kỳ',
    heading: 'Chăm sóc mẹ và bé từ những điều nhỏ nhất.',
    description: 'Một nơi an toàn để lưu hồ sơ sức khỏe, nhận lời khuyên và kết nối chuyên gia.',
    image: '/nutrimom-baby.png',
    imageAlt: 'Minh họa em bé đang ngủ yên trên đám mây',
    imageWidth: 1024,
    imageHeight: 924,
  },
  register: {
    eyebrow: 'Bắt đầu từ yêu thương',
    heading: 'Khởi đầu an tâm cho hành trình mẹ và bé.',
    description: 'Tạo hồ sơ riêng để lưu giữ từng cột mốc, theo dõi sức khỏe và nhận hỗ trợ phù hợp trong suốt thai kỳ.',
    image: '/register-panel.jpg',
    imageAlt: 'Minh họa mẹ ôm em bé ngủ yên trên đám mây',
    imageWidth: 1254,
    imageHeight: 1254,
  },
} as const

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  panelVariant = 'login',
  showHomeLink = false,
}: AuthLayoutProps) {
  const panel = panelContent[panelVariant]

  return (
    <main className="auth-page">
      <section className={`brand-panel brand-panel--${panelVariant}`} aria-label="Giới thiệu NutriMom">
        <Link className="brand-lockup" to="/login" aria-label="NutriMom, về trang đăng nhập">
          <img src="/nutrimom-logo.png" width="46" height="46" alt="" />
          <span>NutriMom</span>
        </Link>

        <div className="brand-copy">
          <div className="brand-eyebrow">
            <Heart size={17} weight="fill" aria-hidden="true" />
            {panel.eyebrow}
          </div>
          <h1>{panel.heading}</h1>
          <p>{panel.description}</p>
        </div>

        <figure className="brand-visual">
          <img
            src={panel.image}
            alt={panel.imageAlt}
            width={panel.imageWidth}
            height={panel.imageHeight}
          />
        </figure>

        <div className="privacy-note">
          <ShieldCheck size={21} aria-hidden="true" />
          <span>Dữ liệu phiên được bảo vệ và không hiển thị công khai.</span>
        </div>
      </section>

      <section className="form-panel">
        <div className="form-panel-toolbar">
          <Link className="mobile-brand" to="/login">
            <img src="/nutrimom-logo.png" width="38" height="38" alt="" />
            <span>NutriMom</span>
          </Link>
          <div className="form-panel-actions">
            {showHomeLink && (
              <Link className="home-return-link" to="/">
                <House size={18} weight="bold" aria-hidden="true" />
                <span>Trang chủ</span>
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>

        <div className="form-frame">
          <header className="form-heading">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </header>
          {children}
          {footer && <footer className="form-footer">{footer}</footer>}
        </div>
      </section>
    </main>
  )
}
