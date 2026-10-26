import { useEffect, useState, useSyncExternalStore } from 'react'
import { adminReads } from '../api/admin-read'

export function useAdminCooldown(key = 'GET:/admin/') {
  const until = useSyncExternalStore(adminReads.subscribe, () => adminReads.cooldownUntil(key), () => 0)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    setNow(Date.now())
    if (until <= Date.now()) return
    const timer = window.setInterval(() => { setNow(Date.now()); if (Date.now() >= until) window.clearInterval(timer) }, 1000)
    return () => window.clearInterval(timer)
  }, [until])
  return { seconds: Math.max(0, Math.ceil((until - now) / 1000)), until }
}
