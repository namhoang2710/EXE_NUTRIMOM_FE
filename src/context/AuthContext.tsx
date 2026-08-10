import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { authApi } from '../lib/api'
import { clearSession, getSession } from '../lib/token-store'
import type { LoginPayload, RegisterPayload, RequestOtpPayload, User, VerifyOtpPayload } from '../types/auth'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let active = true

    async function restoreSession() {
      if (!getSession()) {
        if (active) setStatus('anonymous')
        return
      }

      try {
        const currentUser = await authApi.me()
        if (!active) return
        setUser(currentUser)
        setStatus('authenticated')
      } catch {
        clearSession()
        if (!active) return
        setUser(null)
        setStatus('anonymous')
      }
    }

    void restoreSession()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const session = await authApi.login(payload)
    setUser(session.user)
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const session = await authApi.register(payload)
    setUser(session.user)
    setStatus('authenticated')
  }, [])

  const requestOtp = useCallback((payload: RequestOtpPayload) => authApi.requestOtp(payload), [])

  const verifyOtp = useCallback(async (payload: VerifyOtpPayload) => {
    const result = await authApi.verifyOtp(payload)
    setUser(result.session.user)
    setStatus('authenticated')
    return { newUser: result.newUser }
  }, [])

  const refresh = useCallback(async () => {
    const session = await authApi.refresh()
    setUser(session.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    login,
    register,
    requestOtp,
    verifyOtp,
    refresh,
    logout,
  }), [status, user, login, register, requestOtp, verifyOtp, refresh, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
