import { apiClient, type ApiRequestOptions } from '@/core/api/api-client'
import { ApiClientError } from '@/core/api/api-error'
import { getSessionScope } from '@/core/auth/token-store'
import { createRateLimitGuard } from '@/core/api/rate-limit-guard'
import { createAdminReadCoordinator } from '@/features/admin/model/admin-read-coordinator'

// A short, session-scoped read cache also leases requests through StrictMode replay.
const reads = createAdminReadCoordinator(Date.now, 40)
const limits = createRateLimitGuard()
const writes = new Map<string, Promise<unknown>>()
let scope = ''
function syncScope() {
  const next = getSessionScope()
  if (next !== scope) { scope = next; reads.setScope(next); limits.clear(); writes.clear() }
  return next
}
function family(path: string) {
  if (path.includes('/media')) return 'media'
  if (/\/reports(?:[/?]|$)/.test(path)) return 'reports'
  if (/\/(like|save)(?:[/?]|$)/.test(path)) return 'reactions'
  if (/\/comments?(?:[/?]|$)/.test(path)) return 'comments'
  return 'community'
}
async function request<T>(path: string, options: ApiRequestOptions) {
  const currentScope = syncScope()
  const key = limits.key(currentScope, 'ALL', family(path))
  limits.assertAvailable(key)
  try { return await apiClient.request<T>(path, options) }
  catch (reason) {
    if (currentScope === getSessionScope() && reason instanceof ApiClientError) limits.record(key, reason)
    throw reason
  }
}
export function invalidateCommunityReads(...paths: string[]) {
  for (const path of paths.length ? paths : ['/community/posts', '/community/me/posts']) reads.expire(`GET:${path}`)
}
export function communityRead<T>(path: string, signal?: AbortSignal, ttl = 5_000) {
  syncScope()
  return reads.read(`GET:${path}`, (sharedSignal) => request<T>(path, { signal: sharedSignal }), signal, ttl)
}
export function refreshCommunityRead<T>(path: string, signal?: AbortSignal) {
  syncScope()
  // A deliberate conflict refresh must not join an older in-flight detail read.
  reads.invalidate(`GET:${path}`)
  return communityRead<T>(path, signal)
}
export function communityWrite<T>(path: string, options: ApiRequestOptions) {
  const currentScope = syncScope()
  if (options.body instanceof FormData) return request<T>(path, { ...options, retryAfterRefresh: false })
  const key = `${currentScope}:${options.method}:${path}:${typeof options.body === 'string' ? options.body : ''}`
  const existing = writes.get(key)
  if (existing) return existing as Promise<T>
  const pending = request<T>(path, { ...options, retryAfterRefresh: false }).then((value) => {
    if (currentScope === getSessionScope()) {
      if (path.includes('/notifications')) invalidateCommunityReads('/community/notifications')
      else if (path.includes('/comments')) invalidateCommunityReads('/community/posts')
      else if (!path.endsWith('/media')) invalidateCommunityReads()
    }
    return value
  }).finally(() => { if (writes.get(key) === pending) writes.delete(key) })
  writes.set(key, pending)
  return pending
}
