import {
  Cloud,
  Footprints,
  Heart,
  List,
  MagnifyingGlass,
  Moon,
  Sparkle,
  Star,
  StarFour,
  UserCircle,
  X,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { landingNavigation } from './landing-navigation'

const searchSuggestions = [
  'Tìm dịch vụ chăm sóc thai kỳ...',
  'Tìm chuyên gia đồng hành...',
  'Tìm kiến thức dinh dưỡng cho mẹ...',
  'Tìm hồ sơ và cột mốc sức khỏe...',
]

export function LandingHeader() {
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [headerHidden, setHeaderHidden] = useState(false)
  const lastScrollY = useRef(0)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSuggestionIndex((current) => (current + 1) % searchSuggestions.length)
    }, 2800)
    return () => window.clearInterval(timer)
  }, [])

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

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim()
    navigate(value ? `/services?search=${encodeURIComponent(value)}` : '/services')
    setMenuOpen(false)
  }

  return (
    <header className={`landing-header${headerHidden ? ' is-hidden' : ''}`}>
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

        <div className="landing-header-center">
          <form className="landing-search" role="search" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="site-search">Tìm kiếm dịch vụ NutriMom</label>
            <MagnifyingGlass size={19} aria-hidden="true" />
            <div className="landing-search-field">
              <input
                id="site-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                aria-label="Tìm kiếm dịch vụ NutriMom"
              />
              {!query && !searchFocused && (
                <span className="landing-search-hint" key={suggestionIndex} aria-hidden="true">
                  {searchSuggestions[suggestionIndex]}
                </span>
              )}
            </div>
            <button type="submit" aria-label="Tìm kiếm">
              <MagnifyingGlass size={18} weight="bold" />
            </button>
          </form>
        </div>

        <div className="landing-header-actions">
          <Link className="landing-account-button" to="/login" aria-label="Đăng nhập" title="Đăng nhập">
            <UserCircle weight="fill" aria-hidden="true" />
          </Link>
          <ThemeToggle />
          <button
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

      <nav
        className={`landing-subnav nutrimom-header-content-layer${menuOpen ? ' is-open' : ''}`}
        id="landing-navigation"
        aria-label="Điều hướng chính"
      >
        {landingNavigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => isActive ? 'is-active' : undefined}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
