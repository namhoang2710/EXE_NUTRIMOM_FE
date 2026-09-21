export interface UserDto {
  id: string
  phone: string
  display_name: string
  roles?: string[]
  role?: string
  onboarding_status?: 'PROFILE_REQUIRED' | 'CONTEXT_REQUIRED' | 'COMPLETED'
  status: string
  created_at: string
}

export interface AuthResponseDto {
  access_token: string
  expires_in: number
  refresh_token: string
  refresh_expires_in: number
  token_type: string
  user: UserDto
}

export interface OtpChallengeDto {
  challenge_id: string
  masked_phone: string
  delivery_channel: string
  expires_in: number
  resend_after: number
  debug_code?: string
}

export interface OtpVerifyResultDto {
  new_user: boolean
  authentication: AuthResponseDto
}

export interface LoginRequestDto {
  phone: string
  password: string
  device_id: string
}

export interface RegisterRequestDto extends LoginRequestDto {
  display_name: string
  accepted_terms: boolean
}

export interface RequestOtpRequestDto {
  phone: string
  purpose: 'LOGIN' | 'REGISTER'
  accepted_terms?: boolean
  device_id: string
}

export interface VerifyOtpRequestDto {
  challenge_id: string
  code: string
  device_id: string
  display_name?: string
}
