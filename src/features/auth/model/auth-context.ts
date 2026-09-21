import { createContext } from 'react'
import type { LoginInput, OtpChallenge, RegisterInput, RequestOtpInput, User, VerifyOtpInput } from './auth-types'
import type { UserProfile } from '@/features/user/model/user-types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  profile: UserProfile | null
  profileError: string | null
  reloadProfile: () => Promise<UserProfile>
  login: (payload: LoginInput) => Promise<User>
  register: (payload: RegisterInput) => Promise<void>
  requestOtp: (payload: RequestOtpInput) => Promise<OtpChallenge>
  verifyOtp: (payload: VerifyOtpInput) => Promise<{ newUser: boolean; user: User }>
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
