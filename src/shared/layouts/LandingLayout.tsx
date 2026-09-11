import { useEffect, useLayoutEffect } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { LandingFooter } from './LandingFooter'
import { LandingHeader } from './LandingHeader'

const landingScrollPositions = new Map<string, number>()

export function LandingLayout() {
  const location = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return

    const previousMode = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previousMode
    }
  }, [])

  useLayoutEffect(() => {
    if (navigationType === 'POP') {
      window.scrollTo({ top: landingScrollPositions.get(location.key) ?? 0, behavior: 'auto' })
    } else if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }

    return () => {
      landingScrollPositions.set(location.key, window.scrollY)
    }
  }, [location.hash, location.key, navigationType])

  return (
    <div className="landing-shell">
      <LandingHeader />
      <Outlet />
      <LandingFooter />
    </div>
  )
}
