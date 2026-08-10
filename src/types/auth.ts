export type OtpPurpose = 'LOGIN' | 'REGISTER'

export interface ApiEnvelope<T> {
  data: T
  meta: {
    request_id?: string
    server_time?: string
  }
}

export interface ApiErrorBody {
  code: string
  message: string
  fields?: Record<string, string>
  retryable?: boolean
  request_id?: string
}

export interface ApiUser {
  id: string
  phone: string
  display_name: string
  roles: string[]
  status: string
  created_at: string
}

export interface User {
  id: string
  phone: string
  displayName: string
  roles: string[]
  status: string
  createdAt: string
}

export interface ApiAuthResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  refresh_expires_in: number
  token_type: string
  user: ApiUser
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  refreshExpiresAt: number
  tokenType: string
  user: User
}

export interface OtpChallenge {
  challenge_id: string
  masked_phone: string
  delivery_channel: string
  expires_in: number
  resend_after: number
  debug_code?: string
}

export interface OtpVerifyResult {
  new_user: boolean
  authentication: ApiAuthResponse
}

export interface LoginPayload {
  phone: string
  password: string
  device_id: string
}

export interface RegisterPayload extends LoginPayload {
  display_name: string
}

export interface RequestOtpPayload {
  phone: string
  purpose: OtpPurpose
  accepted_terms?: boolean
  device_id: string
}

export interface VerifyOtpPayload {
  challenge_id: string
  code: string
  device_id: string
  display_name?: string
}

export function normalizeUser(user: ApiUser): User {
  return {
    id: user.id,
    phone: user.phone,
    displayName: user.display_name,
    roles: user.roles,
    status: user.status,
    createdAt: user.created_at,
  }
}
