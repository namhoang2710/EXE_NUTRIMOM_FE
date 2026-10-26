import { useEffect, useState } from 'react'
import { clearSession, getSession, getSessionScope } from '@/core/auth/token-store'
import { env } from '@/core/config/env'
import { logDiagnostic } from '@/core/diagnostics/logger'
import { adminReads } from '../api/admin-read'
import { openAdminRealtime } from '../api/admin-realtime-transport'
import { adminRealtime, setAdminRealtime } from '../api/admin-realtime-store'
import { createAdminRealtimeConnection } from '../model/admin-realtime-connection'
import { createAdminRealtimeSync } from '../model/admin-realtime-sync'

export function useAdminRealtimeOwner() {
  const [lifecycle] = useState(() => ({ generation:0 }))
  const [sync] = useState(() => env.adminRealtimeEnabled ? createAdminRealtimeSync({ expire: prefix => adminReads.expire(prefix) }) : undefined)
  // Render-time assignment lets child resource effects join the workspace owner.
  setAdminRealtime(sync)
  useEffect(() => {
    if (!sync) return
    lifecycle.generation++
    const scope = getSessionScope(), session = getSession()
    let alive = true
    const current = () => alive && scope === getSessionScope() && !adminReads.isDenied()
    const deny = () => { adminReads.deny(); window.dispatchEvent(new Event('nutrimom:admin-denied')) }
    const connection = createAdminRealtimeConnection({ userId: session?.user.id ?? '', open: openAdminRealtime, current,
      state: value => sync.setState(value), snapshot: (value, ready) => sync.snapshot(value, ready), block: until => {
        sync.block(until)
        // A stream quota must not be bypassed by fallback API requests.
        adminReads.blockRealtime(until)
      }, forbidden: deny, unauthorized: () => { if (current()) clearSession() },
      diagnostic: () => logDiagnostic({ level: 'warn', category: 'notification', event: 'admin_realtime_invalid_protocol' }),
    })
    const active = () => {
      const available = document.visibilityState === 'visible' && navigator.onLine && current() && Boolean(getSession()?.user.roles.includes('ADMIN'))
      sync.setActive(available)
      if (available) connection.start(); else connection.pause()
    }
    const stop = () => { connection.stop(); sync.setActive(false) }
    window.addEventListener('online', active); window.addEventListener('offline', active); document.addEventListener('visibilitychange', active)
    window.addEventListener('nutrimom:session-changed', stop); window.addEventListener('nutrimom:session-cleared', stop); window.addEventListener('nutrimom:admin-denied', stop)
    active()
    return () => {
      alive = false; connection.stop(); sync.setActive(false)
      window.removeEventListener('online', active); window.removeEventListener('offline', active); document.removeEventListener('visibilitychange', active)
      window.removeEventListener('nutrimom:session-changed', stop); window.removeEventListener('nutrimom:session-cleared', stop); window.removeEventListener('nutrimom:admin-denied', stop)
      // StrictMode replay retains the same sync object and child registrations.
      const cleanup = ++lifecycle.generation
      queueMicrotask(() => { if (lifecycle.generation === cleanup) { sync.dispose(); if (adminRealtime === sync) setAdminRealtime(undefined) } })
    }
  }, [sync,lifecycle])
  return sync
}
