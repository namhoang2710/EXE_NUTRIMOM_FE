export type OtpPurpose = 'LOGIN' | 'REGISTER'

export interface User {
  id: string
  phone: string
  displayName: string
  roles: string[]
  status: string
  createdAt: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  refreshExpiresAt: number
  tokenType: string
  user: User
}

export interface LoginInput {
  phone: string
  password: string
  deviceId: string
}

export interface RegisterInput extends LoginInput {
  displayName: string
}

export interface RequestOtpInput {
  phone: string
  purpose: OtpPurpose
  acceptedTerms?: boolean
  deviceId: string
}

export interface VerifyOtpInput {
  challengeId: string
  code: string
  deviceId: string
  displayName?: string
}

export interface OtpChallenge {
  challengeId: string
  maskedPhone: string
  deliveryChannel: string
  expiresIn: number
  resendAfter: number
  debugCode?: string
}
