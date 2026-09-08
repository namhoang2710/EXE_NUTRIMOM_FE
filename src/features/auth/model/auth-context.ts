import { createContext } from 'react'
import type { LoginInput, OtpChallenge, RegisterInput, RequestOtpInput, User, VerifyOtpInput } from './auth-types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login: (payload: LoginInput) => Promise<void>
  register: (payload: RegisterInput) => Promise<void>
  requestOtp: (payload: RequestOtpInput) => Promise<OtpChallenge>
  verifyOtp: (payload: VerifyOtpInput) => Promise<{ newUser: boolean }>
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
