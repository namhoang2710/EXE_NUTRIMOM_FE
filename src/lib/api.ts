import { getDeviceId } from './device'
import { clearSession, getSession, saveApiSession } from './token-store'
import type {
  ApiAuthResponse,
  ApiEnvelope,
  ApiErrorBody,
  ApiUser,
  AuthSession,
  LoginPayload,
  OtpChallenge,
  OtpVerifyResult,
  RegisterPayload,
  RequestOtpPayload,
  User,
  VerifyOtpPayload,
} from '../types/auth'
import { normalizeUser } from '../types/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

type ApiRequestOptions = RequestInit & {
  authenticated?: boolean
  retryAfterRefresh?: boolean
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>
  readonly retryable: boolean
  readonly requestId?: string

  constructor(status: number, error: ApiErrorBody) {
    super(error.message || 'Không thể kết nối với máy chủ.')
    this.name = 'ApiClientError'
    this.status = status
    this.code = error.code || 'REQUEST_FAILED'
    this.fields = error.fields || {}
    this.retryable = Boolean(error.retryable)
    this.requestId = error.request_id
  }
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: ApiErrorBody }
    if (payload.error) return new ApiClientError(response.status, payload.error)
  } catch {
    // The fallback below keeps non-JSON network errors readable.
  }

  return new ApiClientError(response.status, {
    code: 'REQUEST_FAILED',
    message: response.status >= 500
      ? 'Máy chủ đang bận. Vui lòng thử lại sau.'
      : 'Yêu cầu chưa được xử lý. Vui lòng kiểm tra lại thông tin.',
  })
}

let refreshInFlight: Promise<AuthSession> | null = null

async function performRefresh() {
  const current = getSession()
  if (!current?.refreshToken) {
    throw new ApiClientError(401, {
      code: 'SESSION_EXPIRED',
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    })
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: current.refreshToken,
      device_id: getDeviceId(),
    }),
  })

  if (!response.ok) {
    clearSession()
    throw await readError(response)
  }

  const payload = (await response.json()) as ApiEnvelope<ApiAuthResponse>
  return saveApiSession(payload.data)
}

export function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function request<T>(path: string, options: ApiRequestOptions = {}) {
  const {
    authenticated = true,
    retryAfterRefresh = true,
    headers: providedHeaders,
    ...fetchOptions
  } = options
  const headers = new Headers(providedHeaders)

  if (fetchOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const current = getSession()
  if (authenticated && current?.accessToken) {
    headers.set('Authorization', `${current.tokenType} ${current.accessToken}`)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers })
  } catch {
    throw new ApiClientError(0, {
      code: 'NETWORK_ERROR',
      message: 'Không kết nối được backend. Hãy kiểm tra Spring Boot đang chạy ở cổng 8080.',
      retryable: true,
    })
  }

  if (response.status === 401 && authenticated && retryAfterRefresh && current?.refreshToken) {
    await refreshSession()
    return request<T>(path, { ...options, retryAfterRefresh: false })
  }

  if (!response.ok) throw await readError(response)
  const payload = (await response.json()) as ApiEnvelope<T>
  return payload.data
}

async function login(payload: LoginPayload) {
  const response = await request<ApiAuthResponse>('/auth/login', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(payload),
  })
  return saveApiSession(response)
}

async function register(payload: RegisterPayload) {
  const response = await request<ApiAuthResponse>('/auth/register', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(payload),
  })
  return saveApiSession(response)
}

async function requestOtp(payload: RequestOtpPayload) {
  return request<OtpChallenge>('/auth/otp/request', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(payload),
  })
}

async function verifyOtp(payload: VerifyOtpPayload) {
  const response = await request<OtpVerifyResult>('/auth/otp/verify', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(payload),
  })
  return {
    newUser: response.new_user,
    session: saveApiSession(response.authentication),
  }
}

async function me(): Promise<User> {
  const response = await request<ApiUser>('/auth/me')
  return normalizeUser(response)
}

async function logout() {
  const current = getSession()
  try {
    if (current?.refreshToken) {
      await request<{ logged_out: boolean }>('/auth/logout', {
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
