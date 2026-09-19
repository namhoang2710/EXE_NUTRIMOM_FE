import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AuthenticatedNavbar } from './AuthenticatedNavbar'
import { LandingFooter } from './LandingFooter'

export function AppLayout() {
  const location = useLocation()
  useEffect(() => {
    if (!location.hash) return
    const frame = window.requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return () => window.cancelAnimationFrame(frame)
  }, [location.key, location.hash])
  return <div className="nm-app-shell"><AuthenticatedNavbar /><div className="nm-app-content"><Outlet /></div><LandingFooter /></div>
}
