import { createContext } from 'react'
import { authApi } from '../lib/api'
import type { LoginPayload, RegisterPayload, User, VerifyOtpPayload } from '../types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  requestOtp: typeof authApi.requestOtp
  verifyOtp: (payload: VerifyOtpPayload) => Promise<{ newUser: boolean }>
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
