import { useEffect, useState } from 'react'

export function useAdminClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: number
    function tick() {
      const current = new Date()
      setNow(current)
      timer = window.setTimeout(tick, 60_000 - current.getTime() % 60_000 + 20)
    }
    const sync = () => { window.clearTimeout(timer); tick() }
    tick()
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync) }
  }, [])
  return now
}
