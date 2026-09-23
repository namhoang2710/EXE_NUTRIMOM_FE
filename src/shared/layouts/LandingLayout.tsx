import { useEffect, useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { LandingFooter } from './LandingFooter'
import { LandingHeader } from './LandingHeader'

const landingScrollPositions = new Map<string, number>()

export function LandingLayout() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const previousLocation = useRef(location)

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return

    const previousMode = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previousMode
    }
  }, [])

  useLayoutEffect(() => {
    const previous = previousLocation.current
    previousLocation.current = location
    const onlySearchChanged = previous.pathname === location.pathname && previous.hash === location.hash
    if (navigationType === 'POP') {
      window.scrollTo({ top: landingScrollPositions.get(location.key) ?? 0, behavior: 'auto' })
    } else if (!onlySearchChanged) {
      // Query-only changes keep the reader at the library filters.
      if (location.hash) {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' })
      }
    }

    return () => {
      landingScrollPositions.set(location.key, window.scrollY)
    }
  }, [location, navigationType])

  return (
    <div className="landing-shell">
      <LandingHeader />
      <Outlet />
      <LandingFooter />
    </div>
  )
}
