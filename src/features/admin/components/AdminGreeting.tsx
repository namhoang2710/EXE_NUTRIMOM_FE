import { useEffect, useRef } from 'react'
import { useAdminClock } from '../hooks/useAdminClock'
import { adminGreeting, formatAdminClock } from '../model/admin-clock'
import { vietnamToday } from '../model/admin-workspace-query'

/** Clock state is isolated here. Only a Vietnam day boundary notifies the active dashboard. */
export function AdminGreeting() {
  const now = useAdminClock(), day = vietnamToday(now), previousDay = useRef(day)
  useEffect(() => {
    if (previousDay.current !== day) { previousDay.current = day; window.dispatchEvent(new CustomEvent('nutrimom:admin-vietnam-day', { detail: day })) }
  }, [day])
  return <div className="admin-greeting"><strong>{adminGreeting(now)}</strong><span className="admin-greeting-separator" aria-hidden>|</span><span>{formatAdminClock(now)}</span></div>
}
