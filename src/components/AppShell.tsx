import { ClipboardText, Gear, Heartbeat, House, SignOut, UserCircle } from '@phosphor-icons/react'
import type { PropsWithChildren } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ThemeToggle } from './ThemeToggle'

const links = [
  { to: '/app', label: 'Tổng quan', icon: House },
  { to: '/app/health', label: 'Sức khỏe', icon: Heartbeat },
  { to: '/app/care', label: 'Chăm sóc', icon: ClipboardText },
  { to: '/app/records', label: 'Hồ sơ y tế', icon: ClipboardText },
  { to: '/app/profile', label: 'Cá nhân', icon: UserCircle },
  { to: '/app/preferences', label: 'Cài đặt', icon: Gear },
]

export function AppShell({ children }: PropsWithChildren) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="app-page">
      <header className="account-nav">
        <div className="account-nav-inner">
          <NavLink className="brand-lockup compact" to="/app">
            <img src="/nutrimom-logo.png" width="42" height="42" alt="" />
            <span>NutriMom</span>
          </NavLink>
          <div className="nav-actions">
            <span className="nav-user">{user?.displayName}</span>
            <ThemeToggle />
            <button className="nav-logout" type="button" onClick={() => void handleLogout()}>
              <SignOut size={19} /> <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>
      <div className="app-layout">
        <nav className="app-nav" aria-label="Điều hướng chính">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/app'} className="app-nav-link">
              <Icon size={20} weight="duotone" /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <section className="app-content">{children}</section>
      </div>
    </main>
  )
}
