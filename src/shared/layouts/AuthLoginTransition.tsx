import { useEffect, useState, type PropsWithChildren } from 'react'
import { useReducedMotion } from 'motion/react'
import { Navigate } from 'react-router-dom'
import { getSessionScope } from '@/core/auth/token-store'
import { overviewLoginEntry } from '@/features/user/model/overview-login-entry'

export const AUTH_SCENE_EXIT_MS = 410

interface AuthLoginTransitionProps extends PropsWithChildren {
  authenticated: boolean
  to: string
  state?: { authorizationError: string }
}

/** Only animate a newly accepted session; restored sessions redirect immediately. */
export function AuthLoginTransition({ authenticated, to, state, children }: AuthLoginTransitionProps) {
  const [animateExit] = useState(() => !authenticated)
  const [closed, setClosed] = useState(false)
  const reducedMotion = useReducedMotion()
  const closing = authenticated && animateExit

  useEffect(() => {
    if (!closing || reducedMotion) return
    const scope = getSessionScope()
    const timer = window.setTimeout(() => {
      overviewLoginEntry.markPanelsOpened(scope)
      setClosed(true)
    }, AUTH_SCENE_EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [closing, reducedMotion])

  if (authenticated && (!animateExit || reducedMotion || closed)) {
    return <Navigate to={to} replace state={{ ...state, authEntry: animateExit && !reducedMotion }} />
  }

  return (
    <div className="auth-login-transition" data-state={closing ? 'closing' : 'open'} inert={closing}>
      {children}
    </div>
  )
}
