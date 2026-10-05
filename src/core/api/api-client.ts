import { getDeviceId } from '../auth/device.ts'
import { getSession } from '../auth/token-store.ts'
import { env } from '../config/env.ts'
import { ApiClientError, parseApiError } from './api-error.ts'
import { ErrorCodes } from './error-code.ts'
import type { ApiResponse } from './api-response.ts'
import { logDiagnostic } from '../diagnostics/logger.ts'

export interface ApiRequestOptions extends RequestInit {
  authenticated?: boolean
  idempotencyKey?: string
  retryAfterRefresh?: boolean
  timeoutMs?: number
}

type RefreshHandler = () => Promise<unknown>

let refreshHandler: RefreshHandler | null = null
let refreshInFlight: Promise<unknown> | null = null
const protectedRequests = new Set<AbortController>()

if (typeof window !== 'undefined') {
  window.addEventListener('nutrimom:session-cleared', () => {
    logDiagnostic({ level: 'warn', category: 'api', event: 'session_cleared', reason: 'auth-event' })
    for (const controller of protectedRequests) controller.abort('session-cleared')
    protectedRequests.clear()
  })
}

function createRequestId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function preferredLanguage() {
  return 'vi-VN'
}

export function setRefreshHandler(handler: RefreshHandler | null) {
  refreshHandler = handler
  if (!handler) refreshInFlight = null
}

function refreshOnce() {
  if (!refreshHandler) return Promise.reject(new Error('Refresh handler is unavailable.'))
  if (!refreshInFlight) {
    logDiagnostic({ level: 'info', category: 'api', event: 'token_refresh_started' })
    refreshInFlight = Promise.resolve().then(refreshHandler)
      .then((result) => { logDiagnostic({ level: 'info', category: 'api', event: 'token_refresh_succeeded' }); return result })
      .catch((reason: unknown) => { logDiagnostic({ level: 'error', category: 'api', event: 'token_refresh_failed', reason: reason instanceof Error ? reason.name : 'unknown' }); throw reason })
      .finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

function abortedError(timedOut = false) {
  return new ApiClientError(0, {
    code: timedOut ? ErrorCodes.requestTimeout : ErrorCodes.requestAborted,
    message: timedOut ? 'Yêu cầu đã quá thời gian chờ.' : 'Yêu cầu đã bị hủy.',
    retryable: timedOut,
  })
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
  const method = fetchOptions.method || 'GET'
  const routeTemplate = path.split('?')[0]
  const startedAt = Date.now()

  headers.set('Accept', 'application/json')
  headers.set('Accept-Language', preferredLanguage())
  headers.set('X-Device-Id', getDeviceId())
  headers.set('X-Request-Id', headers.get('X-Request-Id') || createRequestId())
  const clientRequestId = headers.get('X-Request-Id') || undefined
  logDiagnostic({ level: 'debug', category: 'api', event: 'request_started', method, route_template: routeTemplate, client_request_id: clientRequestId })

  if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)
  if (authenticated && current?.accessToken) {
    headers.set('Authorization', `Bearer ${current.accessToken}`)
  }

  const controller = new AbortController()
  if (authenticated) protectedRequests.add(controller)
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
    if (authenticated) protectedRequests.delete(controller)
    if (error instanceof DOMException && error.name === 'AbortError') {
      logDiagnostic({ level: timedOut ? 'warn' : 'info', category: 'api', event: timedOut ? 'request_timeout' : 'request_aborted', method, route_template: routeTemplate, client_request_id: clientRequestId, duration_ms: Date.now() - startedAt })
      throw abortedError(timedOut)
    }
    logDiagnostic({ level: 'error', category: 'api', event: 'network_failure', method, route_template: routeTemplate, client_request_id: clientRequestId, duration_ms: Date.now() - startedAt, reason: error instanceof Error ? error.name : 'unknown' })
    throw new ApiClientError(0, {
      code: ErrorCodes.networkError,
      message: 'Không kết nối được backend. Hãy kiểm tra Spring Boot đang chạy ở cổng 8080.',
      retryable: true,
    })
  } finally {
    window.clearTimeout(timeoutId)
    providedSignal?.removeEventListener('abort', abortRequest)
  }

  try {
    if (response.status === 401 && authenticated && retryAfterRefresh) {
      const latest = getSession()
      if (latest && latest !== current) {
        logDiagnostic({ level: 'info', category: 'api', event: 'retry_after_refresh', method, route_template: routeTemplate, client_request_id: clientRequestId, retry_attempt: 1, reason: 'session-already-rotated' })
        return request<T>(path, { ...options, retryAfterRefresh: false })
      }
      if (current?.refreshToken && refreshHandler) {
        await refreshOnce()
        if (controller.signal.aborted) throw abortedError()
        logDiagnostic({ level: 'info', category: 'api', event: 'retry_after_refresh', method, route_template: routeTemplate, client_request_id: clientRequestId, retry_attempt: 1 })
        return request<T>(path, { ...options, retryAfterRefresh: false })
      }
    }

    if (!response.ok) {
      const parsed = await parseApiError(response)
      logDiagnostic({ level: 'warn', category: 'api', event: 'request_failed', method, route_template: routeTemplate, status: response.status, error_code: parsed.code, client_request_id: clientRequestId, server_request_id: parsed.requestId || response.headers.get('X-Request-Id') || undefined, duration_ms: Date.now() - startedAt })
      throw parsed
    }
    if (response.status === 204) {
      logDiagnostic({ level: 'debug', category: 'api', event: 'request_succeeded', method, route_template: routeTemplate, status: 204, client_request_id: clientRequestId, server_request_id: response.headers.get('X-Request-Id') || undefined, duration_ms: Date.now() - startedAt })
      return undefined as T
    }

    const payload = (await response.json()) as ApiResponse<T>
    logDiagnostic({ level: 'debug', category: 'api', event: 'request_succeeded', method, route_template: routeTemplate, status: response.status, client_request_id: clientRequestId, server_request_id: payload.meta?.request_id || response.headers.get('X-Request-Id') || undefined, duration_ms: Date.now() - startedAt })
    return payload.data
  } finally {
    if (authenticated) protectedRequests.delete(controller)
  }
}

export const apiClient = { request }
