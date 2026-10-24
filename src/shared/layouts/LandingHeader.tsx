import {
  Cloud,
  Footprints,
  Heart,
  List,
  Moon,
  Sparkle,
  Star,
  StarFour,
  UserCircle,
  X,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Tabs } from '@/components/ui/vercel-tabs'
import { ThemeToggle } from '../components/ThemeToggle'
import { SocialLinks } from '../components/SocialLinks'
import { landingNavigation } from './landing-navigation'
import { useMotionActivity } from '../hooks/useMotionActivity'

const navigationTabs = landingNavigation.map(item => ({ id: item.to, label: item.label, to: item.to }))

export function LandingHeader() {
  const motionRef = useMotionActivity<HTMLElement>()
  const { pathname } = useLocation()
  const activeTab = landingNavigation.find(item => item.to === '/'
    ? pathname === '/'
    : pathname === item.to || pathname.startsWith(`${item.to}/`))?.to
  const [menuOpen, setMenuOpen] = useState(false)
  const [headerHidden, setHeaderHidden] = useState(false)
  const lastScrollY = useRef(0)
  const menuToggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const viewport = window.matchMedia('(max-width: 1120px)')
    function closeDesktopMenu() {
      if (!viewport.matches) setMenuOpen(false)
    }
    viewport.addEventListener('change', closeDesktopMenu)
    return () => viewport.removeEventListener('change', closeDesktopMenu)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuToggle.current?.focus()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  useEffect(() => {
    let animationFrame = 0

    function updateHeader() {
      const currentScrollY = window.scrollY
      const movement = currentScrollY - lastScrollY.current

      if (menuOpen || currentScrollY < 24) {
        setHeaderHidden(false)
        lastScrollY.current = currentScrollY
      } else if (movement > 6) {
        setHeaderHidden(true)
        lastScrollY.current = currentScrollY
      } else if (movement < -6) {
        setHeaderHidden(false)
        lastScrollY.current = currentScrollY
      }
      animationFrame = 0
    }

    function handleScroll() {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateHeader)
    }

    lastScrollY.current = window.scrollY
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [menuOpen])

  return (
    <header ref={motionRef} className={`landing-header${headerHidden ? ' is-hidden' : ''}`} onFocusCapture={() => setHeaderHidden(false)}>
      <div className="nutrimom-floating-decorations" aria-hidden="true">
        <span className="nutrimom-floating-decoration is-star-four">
          <StarFour size={18} weight="fill" />
        </span>
        <span className="nutrimom-floating-decoration is-star-small">
          <Star size={10} weight="fill" />
        </span>
        <span className="nutrimom-floating-decoration is-cloud">
          <Cloud size={25} weight="duotone" />
        </span>
        <span className="nutrimom-floating-decoration is-heart">
          <Heart size={13} weight="fill" />
        </span>
        <span className="nutrimom-floating-decoration is-moon">
          <Moon size={21} weight="duotone" />
        </span>
        <span className="nutrimom-floating-decoration is-sparkle">
          <Sparkle size={12} weight="fill" />
        </span>
        <span className="nutrimom-floating-decoration is-footprints">
          <Footprints size={17} weight="duotone" />
        </span>
      </div>

      <div className="landing-header-main nutrimom-header-content-layer">
        <Link className="landing-brand" to="/" aria-label="NutriMom, về trang chủ">
          <img src="/nutrimom-logo.png" width="48" height="48" alt="" />
          <span>NutriMom</span>
        </Link>

        <nav
          className={`landing-header-nav${menuOpen ? ' is-open' : ''}`}
          id="landing-navigation"
          aria-label="Điều hướng chính"
        >
          <Tabs tabs={navigationTabs} activeTab={activeTab} onTabChange={() => setMenuOpen(false)} />
          <div className="landing-header-socials" aria-label="Mạng xã hội NutriMom"><SocialLinks /></div>
        </nav>

        <div className="landing-header-actions">
          <div className="landing-header-socials" aria-label="Mạng xã hội NutriMom"><SocialLinks iconOnly /></div>
          <Link className="landing-account-button" to="/login" aria-label="Đăng nhập" title="Đăng nhập">
            <UserCircle weight="fill" aria-hidden="true" />
          </Link>
          <ThemeToggle />
          <button
            ref={menuToggle}
            className="landing-menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="landing-navigation"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X size={22} /> : <List size={22} />}
          </button>
        </div>
      </div>
    </header>
  )
}
