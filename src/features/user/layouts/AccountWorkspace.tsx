import { BookmarkSimple, CaretDown, FileText, FirstAidKit, GearSix, Headset, Heartbeat, House, List, LockKey, SignOut, UserCircle, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { focusTargetForTab, getFocusableElements } from '@/shared/model/dialog-focus'
import './account-workspace.css'

export function AccountWorkspace() {
  const { profile, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(() => location.pathname.startsWith('/app/profile/account/'))
  const [loggingOut, setLoggingOut] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const mobileToggleRef = useRef<HTMLButtonElement>(null)
  const mobileCloseRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMobileOpen(false)
    if (location.pathname.startsWith('/app/profile/account/')) setSettingsOpen(true)
  }, [location.pathname])
  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    const mobileToggle = mobileToggleRef.current
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => mobileCloseRef.current?.focus())
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { setMobileOpen(false); return }
      if (event.key !== 'Tab' || !sidebarRef.current) return
      const focusable = getFocusableElements(sidebarRef.current)
      const target = focusTargetForTab(focusable, document.activeElement, event.shiftKey)
      if (target) { event.preventDefault(); target.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      mobileToggle?.focus()
    }
  }, [mobileOpen])

  async function signOut() {
    setLoggingOut(true)
    try { await logout() } catch { /* The local session is cleared even if the server is unavailable. */ }
    finally { setLoggingOut(false); navigate('/', { replace: true }) }
  }

  const name = profile?.display_name || 'Thành viên NutriMom'
  const initial = name.trim().charAt(0).toUpperCase()
  const accountActive = location.pathname.startsWith('/app/profile/account/')
  const links = [
    { to: '/app/profile', end: true, label: 'Hồ sơ cá nhân', icon: UserCircle },
    { to: '/app/profile/health', end: false, label: 'Thai kỳ & sức khỏe', icon: Heartbeat },
    { to: '/app/profile/care', end: false, label: 'Kế hoạch chăm sóc', icon: FirstAidKit },
    { to: '/app/profile/records', end: false, label: 'Hồ sơ y tế', icon: FileText },
    { to: '/app/profile/saved', end: false, label: 'Bài viết đã lưu', icon: BookmarkSimple },
    { to: '/app/profile/support', end: false, label: 'Hỗ trợ / Liên hệ', icon: Headset },
  ]

  return <div className="nm-account-workspace">
    <button ref={mobileToggleRef} className="nm-account-mobile-toggle" type="button" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-controls="nm-account-sidebar"><List size={20} /> Danh mục tài khoản</button>
    <aside ref={sidebarRef} className={`nm-account-sidebar${mobileOpen ? ' is-open' : ''}`} id="nm-account-sidebar" aria-label="Danh mục tài khoản">
      <div className="nm-account-sidebar-top"><div className="nm-account-sidebar-avatar" aria-hidden="true">{initial}</div><div><strong>{name}</strong><span>Không gian cá nhân</span></div><div className="nm-account-sidebar-actions"><ThemeToggle /><button ref={mobileCloseRef} className="nm-account-sidebar-close" type="button" aria-label="Đóng danh mục" onClick={() => setMobileOpen(false)}><X size={20} /></button></div></div>
      <nav className="nm-account-side-nav" aria-label="Điều hướng tài khoản"><p className="nm-account-side-label">Tài khoản của bạn</p>
        {links.map(({ to, end, label, icon: Icon }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nm-account-side-link${isActive ? ' is-active' : ''}`}><Icon size={20} weight="duotone" aria-hidden="true" />{label}</NavLink>)}
        <button className={`nm-account-side-link nm-account-settings-trigger${accountActive ? ' is-active' : ''}`} type="button" aria-expanded={settingsOpen} aria-controls="nm-account-settings-submenu" onClick={() => setSettingsOpen((open) => !open)}><GearSix size={20} weight="duotone" aria-hidden="true" />Thiết lập tài khoản<CaretDown className={settingsOpen ? 'is-rotated' : ''} size={16} aria-hidden="true" /></button>
        <div className={`nm-account-submenu${settingsOpen ? ' is-open' : ''}`} id="nm-account-settings-submenu" aria-hidden={!settingsOpen}><NavLink to="/app/profile/account/password" tabIndex={settingsOpen ? 0 : -1} className={({ isActive }) => `nm-account-side-link${isActive ? ' is-active' : ''}`}><LockKey size={18} aria-hidden="true" />Mật khẩu</NavLink><NavLink to="/app/profile/account/disable" tabIndex={settingsOpen ? 0 : -1} className={({ isActive }) => `nm-account-side-link${isActive ? ' is-active' : ''}`}><UserCircle size={18} aria-hidden="true" />Vô hiệu hóa tài khoản</NavLink></div>
        <NavLink to="/app" className="nm-account-side-link"><House size={20} weight="duotone" aria-hidden="true" />Về trang chủ</NavLink>
      </nav>
      <button className="nm-account-side-link nm-account-side-logout" type="button" onClick={() => void signOut()} disabled={loggingOut}><SignOut size={20} aria-hidden="true" />{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</button>
    </aside>
    {mobileOpen && <button className="nm-account-sidebar-backdrop" type="button" aria-label="Đóng danh mục" onClick={() => setMobileOpen(false)} />}
    <div className="nm-account-workspace-main"><Outlet /></div>
  </div>
}
