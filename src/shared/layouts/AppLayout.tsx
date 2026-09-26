import { useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AuthenticatedNavbar } from './AuthenticatedNavbar'
import { LandingFooter } from './LandingFooter'

export function AppLayout() {
  const location = useLocation()
  const previousLocation = useRef<{ pathname: string; hash: string } | null>(null)

  useLayoutEffect(() => {
    const previous = previousLocation.current
    const pathnameChanged = previous === null || previous.pathname !== location.pathname
    const hashChanged = previous === null || previous.hash !== location.hash
    previousLocation.current = { pathname: location.pathname, hash: location.hash }

    if (location.hash && (pathnameChanged || hashChanged)) {
      const frame = window.requestAnimationFrame(() => {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      return () => window.cancelAnimationFrame(frame)
    }

    if (pathnameChanged) window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname, location.hash])

  return <div className="nm-app-shell"><AuthenticatedNavbar /><div className="nm-app-content"><Outlet /></div><LandingFooter /></div>
}
