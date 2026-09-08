import { apiClient, setRefreshHandler } from '@/core/api/api-client'
import { ApiClientError } from '@/core/api/api-error'
import { ErrorCodes } from '@/core/api/error-code'
import { getDeviceId } from '@/core/auth/device'
import { clearSession, getSession, saveApiSession } from '@/core/auth/token-store'
import type {
  AuthResponseDto,
  LoginRequestDto,
  OtpChallengeDto,
  OtpVerifyResultDto,
  RegisterRequestDto,
  RequestOtpRequestDto,
  UserDto,
  VerifyOtpRequestDto,
} from '../model/auth-dto'
import { mapOtpChallenge, normalizeUser } from '../model/auth-mappers'
import type {
  AuthSession,
  LoginInput,
  RegisterInput,
  RequestOtpInput,
  User,
  VerifyOtpInput,
} from '../model/auth-types'

let refreshInFlight: Promise<AuthSession> | null = null

async function performRefresh() {
  const current = getSession()
  if (!current?.refreshToken) {
    throw new ApiClientError(401, {
      code: ErrorCodes.sessionExpired,
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    })
  }

  try {
    const response = await apiClient.request<AuthResponseDto>('/auth/refresh', {
      method: 'POST',
      authenticated: false,
      retryAfterRefresh: false,
      body: JSON.stringify({
        refresh_token: current.refreshToken,
        device_id: getDeviceId(),
      }),
    })
    return saveApiSession(response)
  } catch (error) {
    clearSession()
    throw error
  }
}

export function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function login(payload: LoginInput) {
  const request: LoginRequestDto = {
    phone: payload.phone,
    password: payload.password,
    device_id: payload.deviceId,
  }
  const response = await apiClient.request<AuthResponseDto>('/auth/login', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(request),
  })
  return saveApiSession(response)
}

async function register(payload: RegisterInput) {
  const request: RegisterRequestDto = {
    phone: payload.phone,
    password: payload.password,
    device_id: payload.deviceId,
    display_name: payload.displayName,
  }
  const response = await apiClient.request<AuthResponseDto>('/auth/register', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(request),
  })
  return saveApiSession(response)
}

async function requestOtp(payload: RequestOtpInput) {
  const request: RequestOtpRequestDto = {
    phone: payload.phone,
    purpose: payload.purpose,
    accepted_terms: payload.acceptedTerms,
    device_id: payload.deviceId,
  }
  const response = await apiClient.request<OtpChallengeDto>('/auth/otp/request', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(request),
  })
  return mapOtpChallenge(response)
}

async function verifyOtp(payload: VerifyOtpInput) {
  const request: VerifyOtpRequestDto = {
    challenge_id: payload.challengeId,
    code: payload.code,
    device_id: payload.deviceId,
    display_name: payload.displayName,
  }
  const response = await apiClient.request<OtpVerifyResultDto>('/auth/otp/verify', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(request),
  })
  return {
    newUser: response.new_user,
    session: saveApiSession(response.authentication),
  }
}

async function me(): Promise<User> {
  const response = await apiClient.request<UserDto>('/auth/me')
  return normalizeUser(response)
}

async function logout() {
  const current = getSession()
  try {
    if (current?.refreshToken) {
      await apiClient.request<{ logged_out: boolean }>('/auth/logout', {
        method: 'POST',
        authenticated: false,
        retryAfterRefresh: false,
        body: JSON.stringify({ refresh_token: current.refreshToken }),
      })
    }
  } finally {
    clearSession()
  }
}

export const authApi = {
  login,
  register,
  requestOtp,
  verifyOtp,
  me,
  logout,
  refresh: refreshSession,
}

setRefreshHandler(refreshSession)
