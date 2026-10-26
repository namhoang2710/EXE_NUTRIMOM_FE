import { resolveBinaryUrl } from './binary-url.ts'
import { getDeviceId } from '../auth/device.ts'
import { getSession, getSessionScope } from '../auth/token-store.ts'
import { env } from '../config/env.ts'
import { ApiClientError, parseApiError } from './api-error.ts'
import { ErrorCodes } from './error-code.ts'
import type { ApiResponse } from './api-response.ts'
import { logDiagnostic } from '../diagnostics/logger.ts'
import { createRateLimitGuard } from './rate-limit-guard.ts'

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
const rateLimits = createRateLimitGuard()

if (typeof window !== 'undefined') {
  window.addEventListener('nutrimom:session-changed', () => {
    rateLimits.clear()
    refreshInFlight = null
    for (const controller of protectedRequests) controller.abort('session-changed')
    protectedRequests.clear()
  })
  window.addEventListener('nutrimom:session-cleared', () => {
    rateLimits.clear()
    refreshInFlight = null
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

export function refreshOnce() {
  if (!refreshHandler) return Promise.reject(new Error('Refresh handler is unavailable.'))
  if (!refreshInFlight) {
    logDiagnostic({ level: 'info', category: 'api', event: 'token_refresh_started' })
    const pending = Promise.resolve().then(refreshHandler)
      .then((result) => { logDiagnostic({ level: 'info', category: 'api', event: 'token_refresh_succeeded' }); return result })
      .catch((reason: unknown) => { logDiagnostic({ level: 'error', category: 'api', event: 'token_refresh_failed', reason: reason instanceof Error ? reason.name : 'unknown' }); throw reason })
      .finally(() => { if (refreshInFlight === pending) refreshInFlight = null })
    refreshInFlight = pending
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

async function request<T>(path: string, options: ApiRequestOptions = {}, mode: 'json' | 'blob' | 'download' | 'void' = 'json'): Promise<T> {
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
  const url = mode === 'json' || mode === 'download' ? `${env.apiBaseUrl}${path}` : resolveBinaryUrl(path, env.apiBaseUrl, window.location.origin)
  const scope = getSessionScope()
  const current = getSession()
  const method = fetchOptions.method || 'GET'
  const routeTemplate = path.split('?')[0]
  const startedAt = Date.now()
  if (providedSignal?.aborted) throw abortedError()
  const rateLimitKey = rateLimits.key(authenticated ? scope : 'public', method, path)
  rateLimits.assertAvailable(rateLimitKey)

  if (!headers.has('Accept')) headers.set('Accept', mode === 'json' ? 'application/json' : '*/*')
  headers.set('Accept-Language', preferredLanguage())
  headers.set('X-Device-Id', getDeviceId())
  headers.set('X-Request-Id', headers.get('X-Request-Id') || createRequestId())
  const clientRequestId = headers.get('X-Request-Id') || undefined
  logDiagnostic({ level: 'debug', category: 'api', event: 'request_started', method, route_template: routeTemplate, client_request_id: clientRequestId })

  if (mode === 'json' && fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
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
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })
  } catch (error) {
    if (authenticated) protectedRequests.delete(controller)
    window.clearTimeout(timeoutId)
    providedSignal?.removeEventListener('abort', abortRequest)
    if (controller.signal.aborted || error instanceof DOMException && error.name === 'AbortError') {
      logDiagnostic({ level: timedOut ? 'warn' : 'info', category: 'api', event: timedOut ? 'request_timeout' : 'request_aborted', method, route_template: routeTemplate, client_request_id: clientRequestId, duration_ms: Date.now() - startedAt })
      throw abortedError(timedOut)
    }
    logDiagnostic({ level: 'error', category: 'api', event: 'network_failure', method, route_template: routeTemplate, client_request_id: clientRequestId, duration_ms: Date.now() - startedAt, reason: error instanceof Error ? error.name : 'unknown' })
    throw new ApiClientError(0, {
      code: ErrorCodes.networkError,
      message: 'Không kết nối được máy chủ NutriMom. Vui lòng kiểm tra kết nối và thử lại sau.',
      retryable: true,
    })
  }

  try {
    if (authenticated && (scope !== getSessionScope() || controller.signal.aborted)) throw abortedError(timedOut)
    if (response.status === 401 && authenticated && retryAfterRefresh) {
      const latest = getSession()
      if (latest && latest !== current) {
        logDiagnostic({ level: 'info', category: 'api', event: 'retry_after_refresh', method, route_template: routeTemplate, client_request_id: clientRequestId, retry_attempt: 1, reason: 'session-already-rotated' })
        return request<T>(path, { ...options, retryAfterRefresh: false }, mode)
      }
      if (current?.refreshToken && refreshHandler) {
        await refreshOnce()
        if (controller.signal.aborted || scope !== getSessionScope()) throw abortedError()
        logDiagnostic({ level: 'info', category: 'api', event: 'retry_after_refresh', method, route_template: routeTemplate, client_request_id: clientRequestId, retry_attempt: 1 })
        return request<T>(path, { ...options, retryAfterRefresh: false }, mode)
      }
    }

    if (!response.ok) {
      const parsed = await parseApiError(response)
      if (!authenticated || scope === getSessionScope()) rateLimits.record(rateLimitKey, parsed)
      logDiagnostic({ level: 'warn', category: 'api', event: 'request_failed', method, route_template: routeTemplate, status: response.status, error_code: parsed.code, client_request_id: clientRequestId, server_request_id: parsed.requestId || response.headers.get('X-Request-Id') || undefined, duration_ms: Date.now() - startedAt })
      throw parsed
    }
    if (response.status === 204 || mode === 'void') {
      logDiagnostic({ level: 'debug', category: 'api', event: 'request_succeeded', method, route_template: routeTemplate, status: response.status, client_request_id: clientRequestId, server_request_id: response.headers.get('X-Request-Id') || undefined, duration_ms: Date.now() - startedAt })
      return undefined as T
    }

    if (mode === 'blob' || mode === 'download') {
      const blob = await response.blob()
      if (authenticated && (scope !== getSessionScope() || controller.signal.aborted)) throw abortedError(timedOut)
      logDiagnostic({ level: 'debug', category: 'api', event: 'request_succeeded', method, route_template: routeTemplate, status: response.status, client_request_id: clientRequestId, duration_ms: Date.now() - startedAt })
      return (mode === 'download' ? { blob, contentDisposition: response.headers.get('Content-Disposition') } : blob) as T
    }

    const payload = (await response.json()) as ApiResponse<T>
    if (authenticated && (scope !== getSessionScope() || controller.signal.aborted)) throw abortedError(timedOut)
    logDiagnostic({ level: 'debug', category: 'api', event: 'request_succeeded', method, route_template: routeTemplate, status: response.status, client_request_id: clientRequestId, server_request_id: payload.meta?.request_id || response.headers.get('X-Request-Id') || undefined, duration_ms: Date.now() - startedAt })
    return payload.data
  } catch (error) {
    if (controller.signal.aborted) throw abortedError(timedOut)
    throw error
  } finally {
    window.clearTimeout(timeoutId)
    providedSignal?.removeEventListener('abort', abortRequest)
    if (authenticated) protectedRequests.delete(controller)
  }
}

export const apiClient = {
  request,
  binary: (url: string, options: ApiRequestOptions = {}) => request<Blob>(url, options, 'blob'),
  download: (url: string, options: ApiRequestOptions = {}) => request<{ blob: Blob; contentDisposition: string | null }>(url, options, 'download'),
  upload: (url: string, options: ApiRequestOptions) => request<void>(url, options, 'void'),
}
