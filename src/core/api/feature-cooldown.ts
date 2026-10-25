import { ApiClientError } from './api-error.ts'

/** One server policy can cover multiple methods, endpoints and filter values. */
export function createFeatureCooldown(now = Date.now) {
  const entries = new Map<string, { until: number; error: ApiClientError }>()
  const listeners = new Set<() => void>()
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    until(key: string) { return entries.get(key)?.until ?? 0 },
    clearExpired(key: string, expectedUntil: number) {
      const entry = entries.get(key)
      if (entry && entry.until === expectedUntil && entry.until <= now()) { entries.delete(key); listeners.forEach(listener => listener()) }
    },
    assert(key: string) {
      const entry = entries.get(key)
      if (entry && entry.until > now()) throw new ApiClientError(429, { code: entry.error.code, message: entry.error.serverMessage || entry.error.message, retryable: true }, entry.until - now())
    },
    record(key: string, error: unknown) {
      if (!(error instanceof ApiClientError) || error.status !== 429) return
      entries.set(key, { until: Math.max(entries.get(key)?.until ?? 0, now() + Math.max(1000, error.retryAfterMs ?? 30_000)), error })
      listeners.forEach(listener => listener())
    },
  }
}
