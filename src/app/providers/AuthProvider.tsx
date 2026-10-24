import { overviewLoginEntry } from '@/features/user/model/overview-login-entry'
import { dashboardApi } from '@/features/maternity/api/domain-api'
import { expireProfileResource } from '@/core/api/profile-requests'
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getSession, getSessionScope } from '@/core/auth/token-store'
import { authApi } from '@/features/auth/api/auth-api'
import type { LoginInput, RegisterInput, RequestOtpInput, User, VerifyOtpInput } from '@/features/auth/model/auth-types'
import { AuthContext, type AuthContextValue, type AuthStatus } from '@/features/auth/model/auth-context'
import { userApi } from '@/features/user/api/user-api'
import type { UserProfile, ProfilePatch } from '@/features/user/model/user-types'
import { isAdminUser, isExpertUser } from '@/features/auth/model/role-routing'
import { adminLoginAnimation } from '@/features/admin/model/admin-login-animation'
import { clearReturnPath } from '@/features/community/model/community-return-path'
import { ApiClientError, isAuthenticationError } from '@/core/api/api-error'
import { useRetryCountdown } from '@/features/payment/hooks/usePaymentCooldown'

function SessionRecovery({ failure, retry }: { failure: { message: string; retryAt: number }; retry: () => void }) {
  const remaining = useRetryCountdown(failure.retryAt)
  return <main className="session-recovery"><section role="alert"><h1>Chưa thể kiểm tra phiên đăng nhập</h1><p>{failure.message}</p><button className="primary-button" type="button" disabled={remaining > 0} onClick={retry}>{remaining > 0 ? `Thử lại sau ${remaining}s` : 'Thử lại'}</button></section></main>
}

export function AuthProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const location = useLocation()
  const [logoutRedirect, setLogoutRedirect] = useState<AuthContextValue['logoutRedirect']>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const [restoreFailure, setRestoreFailure] = useState<{ message: string; retryAt: number } | null>(null)

  const mounted = useRef(false)
  const profileSequence = useRef(0)

  const reloadProfile = useCallback(async (force = true) => {
    const scope = getSessionScope()
    const sequence = ++profileSequence.current
    if (force) expireProfileResource('user:profile')
    try {
      const latest = await userApi.profile()
      if (mounted.current && scope === getSessionScope() && sequence === profileSequence.current) { setProfile(latest); setProfileError(null) }
      return latest
    } catch (error) {
      if (mounted.current && scope === getSessionScope() && sequence === profileSequence.current) setProfileError(error instanceof Error ? error.message : 'Không thể tải hồ sơ.')
      throw error
    }
  }, [])

  const updateProfile = useCallback(async (body: ProfilePatch) => {
    const sequence = ++profileSequence.current
    const scope = getSessionScope()
    const latest = await userApi.updateProfile(body)
    if (mounted.current && scope === getSessionScope() && sequence === profileSequence.current) { setProfile(latest); setProfileError(null) }
    return latest
  }, [])

  useEffect(() => {
    mounted.current = true
    setRestoreFailure(null)
    let active = true
    const scope = getSessionScope()
    const onCleared = () => { profileSequence.current += 1; if (active) { setRestoreFailure(null); setUser(null); setProfile(null); setProfileError(null); setStatus('anonymous') } }
    window.addEventListener('nutrimom:session-cleared', onCleared)
    async function restoreSession() {
      if (!getSession()) { if (active) setStatus('anonymous'); return }
      try {
        const currentUser = await authApi.me()
        if (!active || scope !== getSessionScope()) return
        setUser(currentUser)
        if (!isAdminUser(currentUser) && !isExpertUser(currentUser)) await reloadProfile(false).catch(() => undefined)
        if (active && scope === getSessionScope() && getSession()) setStatus('authenticated')
      } catch (reason) {
        if (!active || scope !== getSessionScope()) return
        if (isAuthenticationError(reason) || (reason instanceof ApiClientError && reason.status === 403)) clearSession()
        else setRestoreFailure({
          message: reason instanceof Error ? reason.message : 'Máy chủ đang bận. Vui lòng thử lại.',
          retryAt: reason instanceof ApiClientError && reason.status === 429 ? Date.now() + Math.max(1000, reason.retryAfterMs ?? 30_000) : 0,
        })
      }
    }
    void restoreSession()
    return () => { active = false; mounted.current = false; window.removeEventListener('nutrimom:session-cleared', onCleared) }
  }, [reloadProfile, restoreAttempt])

  const acceptSession = useCallback(async (sessionUser: User) => {
    const scope = getSessionScope()
    setLogoutRedirect(null)
    if (!isAdminUser(sessionUser) && !isExpertUser(sessionUser)) {
      overviewLoginEntry.arm(scope)
    }
    setUser(sessionUser)
    setProfile(null)
    if (!isAdminUser(sessionUser) && !isExpertUser(sessionUser)) {
      const latest = await reloadProfile(false).catch(() => undefined)
      if (latest && scope === getSessionScope()) {
        const role = latest.role || sessionUser.role
        const shared = role === 'PARTNER' || role === 'FAMILY_MEMBER'
        void (shared ? dashboardApi.partner() : dashboardApi.mom()).catch(() => undefined)
      }
    }
    if (mounted.current && scope === getSessionScope() && getSession()) setStatus('authenticated')
    return sessionUser
  }, [reloadProfile])

  const login = useCallback(async (payload: LoginInput) => {
    const session = await authApi.login(payload)
    if (isAdminUser(session.user)) adminLoginAnimation.arm(getSessionScope())
    return acceptSession(session.user)
  }, [acceptSession])
  const register = useCallback(async (payload: RegisterInput) => {
    const session = await authApi.register(payload)
    if (session) {
      await acceptSession(session.user)
    }
  }, [acceptSession])
  const activateAccount = useCallback(async (token: string, email?: string) => {
    const session = await authApi.activateAccount(token, email)
    return acceptSession(session.user)
  }, [acceptSession])
  const resendActivation = useCallback((email: string) => authApi.resendActivation(email), [])
  const requestOtp = useCallback((payload: RequestOtpInput) => authApi.requestOtp(payload), [])
  const verifyOtp = useCallback(async (payload: VerifyOtpInput) => {
    const result = await authApi.verifyOtp(payload)
    await acceptSession(result.session.user)
    return { newUser: result.newUser, user: result.session.user }
  }, [acceptSession])
  const requestMagicLink = useCallback((email: string) => authApi.requestMagicLink(email), [])
  const verifyMagicLink = useCallback(async (tokenOrCode: string, email?: string) => {
    const session = await authApi.verifyMagicLink(tokenOrCode, undefined, email)
    return acceptSession(session.user)
  }, [acceptSession])
  const refresh = useCallback(async () => { const session = await authApi.refresh(); if (mounted.current) setUser(session.user) }, [])
  const logout = useCallback(async (destination: '/login' | '/' = '/login') => {
    // Router navigation may be deferred. Guards must not save this old history
    // entry as a return target while the logout navigation is still committing.
    setLogoutRedirect({ locationKey: location.key, to: destination })
    clearReturnPath()
    navigate(destination, { replace: true, state: null })
    await authApi.logout()
  }, [location.key, navigate])

  const value = useMemo<AuthContextValue>(() => ({
    status, user, profile, profileError, logoutRedirect, reloadProfile, updateProfile, login, register, activateAccount, resendActivation, requestOtp, verifyOtp, requestMagicLink, verifyMagicLink, refresh, logout,
  }), [status, user, profile, profileError, logoutRedirect, reloadProfile, updateProfile, login, register, activateAccount, resendActivation, requestOtp, verifyOtp, requestMagicLink, verifyMagicLink, refresh, logout])
  return <AuthContext.Provider value={value}>{restoreFailure ? <SessionRecovery failure={restoreFailure} retry={() => {
    if (Date.now() < restoreFailure.retryAt) return
    expireProfileResource('auth:me')
    setRestoreAttempt((attempt) => attempt + 1)
  }} /> : children}</AuthContext.Provider>
}
