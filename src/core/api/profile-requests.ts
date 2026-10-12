import { getSessionScope } from '../auth/token-store.ts'
import { createResourceCache, forConsumer, StaleResourceError } from './resource-cache.ts'

const cache = createResourceCache()
if (typeof window !== 'undefined') {
  window.addEventListener('nutrimom:session-cleared', () => cache.clear())
  window.addEventListener('nutrimom:session-changed', () => cache.clear())
}

function key(resource: string) { return JSON.stringify([getSessionScope(), resource]) }
export function profileRead<T>(resource: string, load: () => Promise<T>, signal?: AbortSignal) {
  return forConsumer(cache.run(key(resource), load), signal)
}
export function invalidateProfileResources(prefix: string) {
  // Resource prefixes stay within the current login session.
  const scope = getSessionScope()
  cache.invalidate(JSON.stringify([scope, prefix]).slice(0, -2))
}
export function seedProfileResource<T>(resource: string, value: T) { cache.set(key(resource), value) }
export function expireProfileResource(resource: string) { cache.expire(key(resource)) }
export function requireCurrentScope(scope: string) {
  if (getSessionScope() !== scope) throw new StaleResourceError()
}
