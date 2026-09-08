import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LandingFooter } from './LandingFooter'
import { LandingHeader } from './LandingHeader'

export function LandingLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return (
    <div className="landing-shell">
      <LandingHeader />
      <Outlet />
      <LandingFooter />
    </div>
  )
}
