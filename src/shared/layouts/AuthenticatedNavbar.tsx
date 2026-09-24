import { CaretDown, List, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { nextNavbarScrollState, type NavbarScrollState } from './navbar-scroll'

export function AuthenticatedNavbar() {
  const { user, profile, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const accountRef = useRef<HTMLDivElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)
  const guideButtonRef = useRef<HTMLButtonElement>(null)
  const scrollState = useRef<NavbarScrollState>({ lastY: 0, movement: 0, visible: true })
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
      if (!guideRef.current?.contains(event.target as Node)) setGuideOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (guideRef.current?.contains(document.activeElement)) guideButtonRef.current?.focus()
      else if (accountRef.current?.contains(document.activeElement)) accountButtonRef.current?.focus()
      setAccountOpen(false); setGuideOpen(false); setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointer); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [])
  useEffect(() => {
    setHeaderVisible(true)
    setMenuOpen(false)
    setAccountOpen(false)
    setGuideOpen(false)
    scrollState.current = { lastY: window.scrollY, movement: 0, visible: true }
  }, [location.pathname])
  useEffect(() => {
    let frame = 0
    scrollState.current = { lastY: window.scrollY, movement: 0, visible: true }
    if (menuOpen || accountOpen || guideOpen) setHeaderVisible(true)

    function updateVisibility() {
      frame = 0
      scrollState.current = nextNavbarScrollState(scrollState.current, window.scrollY, menuOpen || accountOpen || guideOpen)
      setHeaderVisible(scrollState.current.visible)
    }
    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(updateVisibility)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [menuOpen, accountOpen, guideOpen])
  async function signOut() {
    setBusy(true)
    try { await logout() } catch { /* The local session is cleared even if the server is unavailable. */ }
    finally { setBusy(false); navigate('/', { replace: true }) }
  }
  const name = profile?.display_name || user?.displayName || 'Thành viên NutriMom'
  const guideActive = location.pathname === '/app/contact' || location.pathname === '/app/experts'
  function closeNavigation() { setMenuOpen(false); setGuideOpen(false) }
  return <header className={`nm-app-header${headerVisible ? '' : ' is-hidden'}`}><nav className="nm-floating-nav" aria-label="Điều hướng ứng dụng"><Link className="nm-app-brand" to="/app"><img src="/nutrimom-logo.png" alt="" width="39" height="39" /><span>NutriMom</span></Link>
    <div className={`nm-app-links${menuOpen ? ' is-open' : ''}`} id="nm-app-links-mobile">
      <NavLink to="/app" end onClick={closeNavigation}>Trang chủ</NavLink>
      <NavLink to="/app/knowledge" onClick={closeNavigation}>Kiến thức</NavLink>
      <NavLink to="/app/community" onClick={closeNavigation}>Cộng đồng</NavLink>
      <NavLink to="/app/pricing#pricing" onClick={closeNavigation}>Bảng giá</NavLink>
      <div className="nm-guide-menu" ref={guideRef} onMouseEnter={() => { if (window.matchMedia('(min-width: 1101px) and (hover: hover)').matches) setGuideOpen(true) }} onMouseLeave={() => { if (window.matchMedia('(min-width: 1101px) and (hover: hover)').matches) setGuideOpen(false) }} onFocus={(event) => { if ((event.target as HTMLElement).matches(':focus-visible')) setGuideOpen(true) }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setGuideOpen(false) }}>
        <button ref={guideButtonRef} className={`nm-guide-trigger${guideActive ? ' is-active' : ''}`} type="button" aria-expanded={guideOpen} aria-controls="nm-guide-dropdown" onClick={() => { setGuideOpen((open) => window.matchMedia('(max-width: 1100px)').matches ? !open : true); setAccountOpen(false) }}>Hướng dẫn khách hàng <CaretDown size={15} className={guideOpen ? 'is-rotated' : ''} aria-hidden="true" /></button>
        <div className={`nm-guide-dropdown${guideOpen ? ' is-open' : ''}`} id="nm-guide-dropdown" aria-hidden={!guideOpen}><Link to="/app/contact" tabIndex={guideOpen ? 0 : -1} onClick={closeNavigation}>Liên hệ với chúng tôi</Link><Link to="/app/experts" tabIndex={guideOpen ? 0 : -1} onClick={closeNavigation}>Tìm bác sĩ</Link></div>
      </div>
    </div>
    <div className="nm-app-actions"><div className="nm-account-menu" ref={accountRef}><button ref={accountButtonRef} type="button" className="nm-avatar-button" aria-expanded={accountOpen} aria-controls="nm-account-dropdown" onClick={() => { setAccountOpen(!accountOpen); setGuideOpen(false) }}><span className="nm-nav-avatar">{profile?.avatar_url && !avatarFailed ? <img src={profile.avatar_url} alt="" onError={() => setAvatarFailed(true)} /> : name.trim().charAt(0).toUpperCase()}</span><span className="nm-avatar-name">{name}</span></button><div className={`nm-account-dropdown${accountOpen ? ' is-open' : ''}`} id="nm-account-dropdown" aria-hidden={!accountOpen}><Link to="/app/profile" onClick={() => setAccountOpen(false)}>Hồ sơ cá nhân</Link><button type="button" disabled={busy} onClick={() => void signOut()}>{busy ? 'Đang đăng xuất...' : 'Đăng xuất'}</button></div></div><button className="nm-app-menu-toggle" type="button" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} aria-controls="nm-app-links-mobile" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <List size={22} />}</button></div>
  </nav></header>
}
