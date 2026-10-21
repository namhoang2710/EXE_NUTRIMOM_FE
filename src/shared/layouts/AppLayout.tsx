import {
  useLayoutEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AuthenticatedNavbar } from './AuthenticatedNavbar'
import { LandingFooter } from './LandingFooter'
import { getSessionScope } from '@/core/auth/token-store'
import { overviewLoginEntry } from '@/features/user/model/overview-login-entry'
import {
  OverviewEntryContext,
  type OverviewEntryPhase,
} from '@/features/user/model/overview-entry-context'
import '@/features/user/styles/overview-entry.css'

export function AppLayout({ children }: PropsWithChildren) {
  const location = useLocation()
  const overview = location.pathname === '/app' || location.pathname === '/app/'
  const pricingParams = new URLSearchParams(location.search)
  const pricingCatalog =
    location.pathname === '/app/pricing' &&
    !pricingParams.has('plan') &&
    !pricingParams.has('step')
  const bannerHeader =
    overview ||
    pricingCatalog ||
    ['/app/family', '/app/experts', '/app/contact', '/app/consultations', '/app/knowledge'].includes(location.pathname) ||
    location.pathname.startsWith('/app/nutrition')
  const entryStarted = useRef<number | null>(null)
  const [entry, setEntry] = useState<OverviewEntryPhase>('stable')
  useLayoutEffect(() => {
    if (!overview) {
      entryStarted.current = null
      setEntry('stable')
      return
    }
    const panelsAlreadyOpened = overviewLoginEntry.panelsAlreadyOpened(getSessionScope())
    if (
      entryStarted.current === null &&
      overviewLoginEntry.consume(getSessionScope())
    ) {
      // Login has already slid its two panels out. Continue with the scene reveal
      // instead of opening a second pair of curtains. Direct OTP/magic entry
      // keeps the fallback opening when there was no animated login form.
      entryStarted.current = performance.now() - (panelsAlreadyOpened ? 650 : 0)
    }
    if (entryStarted.current === null) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEntry('stable')
      return
    }
    const elapsed = performance.now() - entryStarted.current
    const stages: Array<[number, OverviewEntryPhase]> = [
      [0, 'opening'],
      [650, 'scene'],
      [1250, 'eyebrow'],
      [1600, 'ready'],
    ]
    const timers: number[] = []
    for (const [time, phase] of stages) {
      if (time <= elapsed) setEntry(phase)
      else timers.push(window.setTimeout(() => setEntry(phase), time - elapsed))
    }
    return () => timers.forEach(window.clearTimeout)
  }, [overview])
  const previousLocation = useRef<{ pathname: string; hash: string } | null>(
    null,
  )

  useLayoutEffect(() => {
    const theme = localStorage.getItem('nutrimom.theme')
    if (theme === 'light' || theme === 'dark')
      document.documentElement.dataset.theme = theme
  }, [])

  useLayoutEffect(() => {
    const previous = previousLocation.current
    const pathnameChanged = previous === null || previous.pathname !== location.pathname
    const hashChanged = previous === null || previous.hash !== location.hash
    previousLocation.current = {
      pathname: location.pathname,
      hash: location.hash,
    }

    if (location.hash && (pathnameChanged || hashChanged)) {
      const frame = window.requestAnimationFrame(() => {
        const anchor = overview && location.hash === '#calendar'
          ? document.getElementById('overview-subscription') ?? document.getElementById('calendar')
          : document.getElementById(location.hash.slice(1))
        anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      return () => window.cancelAnimationFrame(frame)
    }

    if (pathnameChanged) window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname, location.hash, overview])

  return (
    <OverviewEntryContext.Provider value={overview ? entry : 'stable'}>
      <div
        className={`nm-app-shell${overview ? ' has-overview-hero' : ''}${bannerHeader ? ' has-banner-header' : ''}`}
        data-overview-entry={overview ? entry : 'stable'}
      >
        {overview && entry === 'opening' && (
          <div className="nm-overview-curtains" aria-hidden="true">
            <span />
            <span />
          </div>
        )}
        <AuthenticatedNavbar />
        <div className="nm-app-content" inert={overview && entry === 'opening'}>
          {children ?? <Outlet />}
        </div>
        <LandingFooter />
      </div>
    </OverviewEntryContext.Provider>
  )
}
