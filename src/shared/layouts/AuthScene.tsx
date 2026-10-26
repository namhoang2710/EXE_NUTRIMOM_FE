import { Suspense, useEffect } from 'react'
import { AnimatePresence, usePresence, useReducedMotion } from 'motion/react'
import { useLocation, useOutlet } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { AUTH_SCENE_EXIT_MS } from './AuthLoginTransition'

function AuthSceneFrame({ children }: PropsWithChildren) {
  const [present, remove] = usePresence()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (present) return
    // Match the CSS exit: 80ms content fade, then a 320ms panel slide.
    const timer = window.setTimeout(() => remove?.(), reducedMotion ? 0 : AUTH_SCENE_EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [present, reducedMotion, remove])

  return (
    <div
      className="auth-scene"
      data-state={present ? 'open' : 'closing'}
      inert={!present}
    >
      <Suspense fallback={<main className="page-skeleton" aria-label="Đang tải trang xác thực" />}>
        {children}
      </Suspense>
    </div>
  )
}

/** Retain the outgoing route until both panels finish closing. */
export function AuthScene() {
  const location = useLocation()
  const outlet = useOutlet()
  return (
    <AnimatePresence mode="wait">
      <AuthSceneFrame key={location.pathname}>{outlet}</AuthSceneFrame>
    </AnimatePresence>
  )
}
