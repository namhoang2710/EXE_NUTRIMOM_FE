import { Heart, ShieldCheck } from '@phosphor-icons/react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

interface AuthLayoutProps extends PropsWithChildren {
  title: string
  subtitle: string
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <section className="brand-panel" aria-label="Giới thiệu NutriMom">
        <Link className="brand-lockup" to="/login" aria-label="NutriMom, về trang đăng nhập">
          <img src="/nutrimom-logo.png" width="46" height="46" alt="" />
          <span>NutriMom</span>
        </Link>

        <div className="brand-copy">
          <div className="brand-eyebrow">
            <Heart size={17} weight="fill" aria-hidden="true" />
            Đồng hành cùng thai kỳ
          </div>
          <h1>Chăm sóc mẹ và bé từ những điều nhỏ nhất.</h1>
          <p>Một nơi an toàn để lưu hồ sơ sức khỏe, nhận lời khuyên và kết nối chuyên gia.</p>
        </div>

        <figure className="brand-visual">
          <img
            src="/nutrimom-baby.png"
            alt="Minh họa em bé đang ngủ yên trên đám mây"
            width="1024"
            height="924"
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
          <ThemeToggle />
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
