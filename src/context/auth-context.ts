import { createContext } from 'react'
import { authApi } from '../lib/api'
import type { LoginPayload, RegisterPayload, User, VerifyOtpPayload } from '../types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login: (payload: LoginPayload) => Promise<User>
  register: (payload: RegisterPayload) => Promise<User>
  requestOtp: typeof authApi.requestOtp
  verifyOtp: (payload: VerifyOtpPayload) => Promise<{ newUser: boolean; user: User }>
  refresh: () => Promise<void>
  reloadUser: () => Promise<User>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
