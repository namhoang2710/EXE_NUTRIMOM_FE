import { apiClient } from '@/core/api/api-client'
import { ApiClientError } from '@/core/api/api-error'
import { clearSession, getSessionScope } from '@/core/auth/token-store'
import { canonicalAdminPath, createAdminReadCoordinator } from '../model/admin-read-coordinator'
import { adminRealtime } from './admin-realtime-store'
import { realtimeGroup } from '../model/admin-realtime-sync'
import { optionalRealtimeRevision } from '../model/admin-realtime-contract'

export const adminReads = createAdminReadCoordinator()
let identity = ''
let authorized = false
export function configureAdminReads(userId: string, roles: readonly string[], authenticated: boolean) {
  const next = `${getSessionScope()}:${userId}:${[...roles].sort().join(',')}`
  authorized = authenticated && roles.includes('ADMIN')
  if (identity !== next) { identity = next; adminReads.setScope(next) }
  if (!authorized) adminReads.clear()
}
export function requireAdmin() {
  if (!authorized || adminReads.isDenied()) throw new Error('Bạn không đủ quyền truy cập Admin.')
}
if (typeof window !== 'undefined') {
  const reset = () => { authorized = false; identity = ''; adminReads.setScope(`cleared:${getSessionScope()}`) }
  window.addEventListener('nutrimom:session-cleared', reset)
  window.addEventListener('nutrimom:session-changed', reset)
}
export function adminRead<T>(path: string, mapper: (payload: unknown) => T, signal?: AbortSignal, ttl = 30_000) {
  try { requireAdmin() } catch (reason) { return Promise.reject<T>(reason) }
  const canonical = canonicalAdminPath(path)
  return adminReads.read(`GET:${canonical}`, async (sharedSignal) => {
    const group = realtimeGroup(canonical)
    const finish = group ? adminRealtime?.begin(`GET:${canonical}`,group) : undefined
    try {
      const raw = await apiClient.request<unknown>(canonical, { signal: sharedSignal })
      const value = mapper(raw)
      finish?.(optionalRealtimeRevision(raw))
      return value
    }
    catch (reason) {
      finish?.(undefined,false,reason instanceof ApiClientError && reason.status === 429)
      if (reason instanceof ApiClientError && !sharedSignal.aborted) {
        if (reason.status === 401) clearSession()
        else if (reason.status === 403) window.dispatchEvent(new Event('nutrimom:admin-denied'))
      }
      throw reason
    }
  }, signal, ttl)
}
export async function adminNotificationMutation<T>(path: string, mapper: (value: unknown) => T) {
  requireAdmin()
  const scope = getSessionScope()
  const key = `POST:${canonicalAdminPath(path)}`
  adminReads.assertAvailable(key)
  try {
    const value = await apiClient.request<unknown>(path, { method: 'POST' })
    if (scope !== getSessionScope()) throw new DOMException('Phiên đã thay đổi', 'AbortError')
    return mapper(value)
  } catch (reason) {
    if (scope === getSessionScope()) {
      adminReads.recordFailure(key, reason)
      if (reason instanceof ApiClientError && reason.status === 401) clearSession()
      else if (reason instanceof ApiClientError && reason.status === 403) window.dispatchEvent(new Event('nutrimom:admin-denied'))
    }
    throw reason
  }
}
export function invalidateAdmin(...paths: string[]) {
  for (const path of paths) adminReads.invalidate(`GET:${path}`)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nutrimom:admin-invalidated', { detail: paths }))
}
export async function adminMutation<T>(action: () => Promise<T>, paths: string[]) {
  requireAdmin()
  // All Admin writes respect the same route-family cooldown as Admin reads.
  adminReads.assertAvailable('GET:/admin/')
  const scope = getSessionScope()
  try {
    const value = await action()
    if (scope !== getSessionScope()) throw new Error('Phiên đăng nhập đã thay đổi.')
    invalidateAdmin(...paths)
    return value
  } catch (reason) {
    if (scope === getSessionScope()) {
      adminReads.recordFailure('GET:/admin/', reason)
      if (reason instanceof ApiClientError && reason.status === 401) clearSession()
      else if (reason instanceof ApiClientError && reason.status === 403) { adminReads.deny(); window.dispatchEvent(new Event('nutrimom:admin-denied')) }
    }
    throw reason
  }
}
