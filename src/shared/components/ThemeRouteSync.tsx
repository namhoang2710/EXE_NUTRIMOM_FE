import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyTheme } from '@/core/theme/theme-store'

export function ThemeRouteSync() {
  const { pathname } = useLocation()
  useLayoutEffect(applyTheme, [pathname])
  return null
}
