import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { clearSession, getSession } from '@/core/auth/token-store'
import { authApi } from '@/features/auth/api/auth-api'
import type { LoginInput, RegisterInput, RequestOtpInput, User, VerifyOtpInput } from '@/features/auth/model/auth-types'
import { AuthContext, type AuthContextValue, type AuthStatus } from '@/features/auth/model/auth-context'
import { userApi } from '@/features/user/api/user-api'
import type { UserProfile } from '@/features/user/model/user-types'

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const reloadProfile = useCallback(async () => {
    try {
      const latest = await userApi.profile()
      setProfile(latest)
      setProfileError(null)
      return latest
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Không thể tải hồ sơ.')
      throw error
    }
  }, [])

  useEffect(() => {
    let active = true
    const onCleared = () => { if (active) { setUser(null); setProfile(null); setStatus('anonymous') } }
    window.addEventListener('nutrimom:session-cleared', onCleared)
    async function restoreSession() {
      if (!getSession()) { if (active) setStatus('anonymous'); return }
      try {
        const currentUser = await authApi.me()
        if (!active) return
        setUser(currentUser)
        await reloadProfile().catch(() => undefined)
        if (active && getSession()) setStatus('authenticated')
      } catch {
        clearSession()
      }
    }
    void restoreSession()
    return () => { active = false; window.removeEventListener('nutrimom:session-cleared', onCleared) }
  }, [reloadProfile])

  const acceptSession = useCallback(async (sessionUser: User) => {
    setUser(sessionUser)
    setProfile(null)
    await reloadProfile().catch(() => undefined)
    if (getSession()) setStatus('authenticated')
    return sessionUser
  }, [reloadProfile])

  const login = useCallback(async (payload: LoginInput) => acceptSession((await authApi.login(payload)).user), [acceptSession])
  const register = useCallback(async (payload: RegisterInput) => { await acceptSession((await authApi.register(payload)).user) }, [acceptSession])
  const requestOtp = useCallback((payload: RequestOtpInput) => authApi.requestOtp(payload), [])
  const verifyOtp = useCallback(async (payload: VerifyOtpInput) => {
    const result = await authApi.verifyOtp(payload)
    await acceptSession(result.session.user)
    return { newUser: result.newUser, user: result.session.user }
  }, [acceptSession])
  const refresh = useCallback(async () => { await acceptSession((await authApi.refresh()).user) }, [acceptSession])
  const logout = useCallback(async () => {
    try { await authApi.logout() } finally { setUser(null); setProfile(null); setProfileError(null); setStatus('anonymous') }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    status, user, profile, profileError, reloadProfile, login, register, requestOtp, verifyOtp, refresh, logout,
  }), [status, user, profile, profileError, reloadProfile, login, register, requestOtp, verifyOtp, refresh, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
