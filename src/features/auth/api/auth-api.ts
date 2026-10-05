import { apiClient, setRefreshHandler } from '../../../core/api/api-client.ts'
import { ApiClientError } from '../../../core/api/api-error.ts'
import { ErrorCodes } from '../../../core/api/error-code.ts'
import { getDeviceId } from '../../../core/auth/device.ts'
import { clearSession, getSession, saveApiSession } from '../../../core/auth/token-store.ts'
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
    if (getSession() !== current) {
      throw new ApiClientError(401, {
        code: ErrorCodes.sessionExpired,
        message: 'Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.',
      })
    }
    return saveApiSession(response)
  } catch (error) {
    if (getSession() === current) clearSession()
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
    email: payload.email,
    password: payload.password,
    device_id: payload.deviceId,
    display_name: payload.displayName,
    accepted_terms: payload.acceptedTerms,
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

async function requestMagicLink(email: string, deviceId?: string) {
  return apiClient.request<{ sent: boolean; message: string; debug_link?: string; debug_code?: string }>('/auth/magic-link/request', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({
      email: email.trim(),
      device_id: deviceId || getDeviceId(),
    }),
  })
}

async function verifyMagicLink(tokenOrCode: string, deviceId?: string, email?: string) {
  const response = await apiClient.request<AuthResponseDto>('/auth/magic-link/verify', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({
      token: tokenOrCode.trim(),
      code: tokenOrCode.trim(),
      email: email ? email.trim() : undefined,
      device_id: deviceId || getDeviceId(),
    }),
  })
  return saveApiSession(response)
}

async function activateAccount(token: string, email?: string, deviceId?: string) {
  const response = await apiClient.request<AuthResponseDto>('/auth/activate', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({
      token: token.trim(),
      email: email ? email.trim() : undefined,
      device_id: deviceId || getDeviceId(),
    }),
  })
  return saveApiSession(response)
}

async function resendActivation(email: string) {
  return apiClient.request<{ sent: boolean; message: string }>('/auth/resend-activation', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({
      email: email.trim(),
    }),
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
