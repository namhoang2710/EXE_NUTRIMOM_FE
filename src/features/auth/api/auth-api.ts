import { profileRead, requireCurrentScope } from '../../../core/api/profile-requests.ts'
import { apiClient, setRefreshHandler } from '../../../core/api/api-client.ts'
import { ApiClientError, isAuthenticationError } from '../../../core/api/api-error.ts'
import { ErrorCodes } from '../../../core/api/error-code.ts'
import { publicAuthRequest } from './password-api.ts'
import { getDeviceId } from '../../../core/auth/device.ts'
import { clearSession, getSession, getSessionScope, saveApiSession } from '../../../core/auth/token-store.ts'
import type {
  AuthResponseDto,
  LoginRequestDto,
  OtpChallengeDto,
  OtpVerifyResultDto,
  RegisterRequestDto,
  RequestOtpRequestDto,
  UserDto,
  VerifyOtpRequestDto,
} from '../model/auth-dto.ts'
import { mapOtpChallenge, normalizeUser } from '../model/auth-mappers.ts'
import type {
  AuthSession,
  LoginInput,
  RegisterInput,
  RequestOtpInput,
  User,
  VerifyOtpInput,
} from '../model/auth-types.ts'

let refreshInFlight: Promise<AuthSession> | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('nutrimom:session-cleared', () => { refreshInFlight = null })
  window.addEventListener('nutrimom:session-changed', () => { refreshInFlight = null })
}

async function performRefresh() {
  const scope = getSessionScope()
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
    if (getSession() !== current) {
      throw new ApiClientError(401, {
        code: ErrorCodes.sessionExpired,
        message: 'Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.',
      })
    }
    requireCurrentScope(scope)
    return saveApiSession(response, true)
  } catch (error) {
    const rejectedSession = isAuthenticationError(error)
      || (error instanceof ApiClientError && (error.status === 403 || error.code === 'INVALID_REFRESH_TOKEN'))
    if (getSession() === current && rejectedSession) clearSession()
    throw error
  }
}

export function refreshSession() {
  if (!refreshInFlight) {
    const pending = performRefresh().finally(() => {
      if (refreshInFlight === pending) refreshInFlight = null
    })
    refreshInFlight = pending
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
    email: payload.email,
    password: payload.password,
    device_id: payload.deviceId,
    display_name: payload.displayName,
    accepted_terms: payload.acceptedTerms,
    acquisition_source: payload.acquisitionSource,
  }
  const response = await apiClient.request<AuthResponseDto>('/auth/register', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(request),
  })
  if (response.access_token) {
    return saveApiSession(response)
  }
  return null
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
  const response = await profileRead('auth:me', () => apiClient.request<UserDto>('/auth/me'))
  return normalizeUser(response)
}

async function logout() {
  const current = getSession()
  // Local logout is immediate, even when remote token revocation is slow or fails.
  // Its eventual response must not clear a session accepted in the meantime.
  clearSession()
  if (current?.refreshToken) {
    await apiClient.request<{ logged_out: boolean }>('/auth/logout', {
      method: 'POST',
      authenticated: false,
      retryAfterRefresh: false,
      body: JSON.stringify({ refresh_token: current.refreshToken }),
    })
  }
}

async function requestMagicLink(email: string, deviceId?: string) {
  return publicAuthRequest<{ sent: boolean; message: string; debug_link?: string; debug_code?: string }>('email-send', '/auth/magic-link/request', {
      email: email.trim(),
      device_id: deviceId || getDeviceId(),
  })
}

async function verifyMagicLink(tokenOrCode: string, deviceId?: string, email?: string) {
  const response = await publicAuthRequest<AuthResponseDto>('code-verify', '/auth/magic-link/verify', {
      token: tokenOrCode.trim(),
      code: tokenOrCode.trim(),
      email: email ? email.trim() : undefined,
      device_id: deviceId || getDeviceId(),
  })
  return saveApiSession(response)
}

async function activateAccount(token: string, email?: string, deviceId?: string) {
  const response = await publicAuthRequest<AuthResponseDto>('code-verify', '/auth/activate', {
      token: token.trim(),
      email: email ? email.trim() : undefined,
      device_id: deviceId || getDeviceId(),
  })
  return saveApiSession(response)
}

async function resendActivation(email: string) {
  return publicAuthRequest<{ sent: boolean; message: string }>('email-send', '/auth/resend-activation', {
      email: email.trim(),
  })
}

export const authApi = {
  login,
  register,
  activateAccount,
  resendActivation,
  requestOtp,
  verifyOtp,
  requestMagicLink,
  verifyMagicLink,
  me,
  logout,
  refresh: refreshSession,
}

setRefreshHandler(refreshSession)
