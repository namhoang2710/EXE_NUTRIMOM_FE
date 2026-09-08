import { getDeviceId } from '@/core/auth/device'
import { getSession } from '@/core/auth/token-store'
import { env } from '@/core/config/env'
import { ApiClientError, parseApiError } from './api-error'
import { ErrorCodes } from './error-code'
import type { ApiResponse } from './api-response'

export interface ApiRequestOptions extends RequestInit {
  authenticated?: boolean
  idempotencyKey?: string
  retryAfterRefresh?: boolean
  timeoutMs?: number
}

type RefreshHandler = () => Promise<unknown>

let refreshHandler: RefreshHandler | null = null

function createRequestId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function preferredLanguage() {
  return typeof navigator === 'undefined' ? 'vi' : navigator.language || 'vi'
}

export function setRefreshHandler(handler: RefreshHandler) {
  refreshHandler = handler
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    authenticated = true,
    idempotencyKey,
    retryAfterRefresh = true,
    timeoutMs = env.apiTimeoutMs,
    headers: providedHeaders,
    signal: providedSignal,
    ...fetchOptions
  } = options
  const headers = new Headers(providedHeaders)
  const current = getSession()

  headers.set('Accept', 'application/json')
  headers.set('Accept-Language', preferredLanguage())
  headers.set('X-Device-Id', getDeviceId())
  headers.set('X-Request-Id', headers.get('X-Request-Id') || createRequestId())

  if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)
  if (authenticated && current?.accessToken) {
    headers.set('Authorization', `Bearer ${current.accessToken}`)
  }

  const controller = new AbortController()
  let timedOut = false
  const abortRequest = () => controller.abort(providedSignal?.reason)
  if (providedSignal?.aborted) abortRequest()
  else providedSignal?.addEventListener('abort', abortRequest, { once: true })
  const timeoutId = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  let response: Response
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError(0, {
        code: timedOut ? ErrorCodes.requestTimeout : ErrorCodes.requestAborted,
        message: timedOut ? 'Yêu cầu đã quá thời gian chờ.' : 'Yêu cầu đã bị hủy.',
        retryable: timedOut,
      })
    }
    throw new ApiClientError(0, {
      code: ErrorCodes.networkError,
      message: 'Không kết nối được backend. Hãy kiểm tra Spring Boot đang chạy ở cổng 8080.',
      retryable: true,
    })
  } finally {
    window.clearTimeout(timeoutId)
    providedSignal?.removeEventListener('abort', abortRequest)
  }

  if (
    response.status === 401
    && authenticated
    && retryAfterRefresh
    && current?.refreshToken
    && refreshHandler
  ) {
    await refreshHandler()
    return request<T>(path, { ...options, retryAfterRefresh: false })
  }

  if (!response.ok) throw await parseApiError(response)
  if (response.status === 204) return undefined as T

  const payload = (await response.json()) as ApiResponse<T>
  return payload.data
}

export const apiClient = { request }
