import { useEffect, useRef } from 'react'

/** Pause decorative CSS loops without React updates on each animation frame. */
export function useMotionActivity<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    let inView = false
    const update = () => { element.dataset.motionActive = String(inView && document.visibilityState === 'visible') }
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update() })
    observer.observe(element)
    update()
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])
  return ref
}
