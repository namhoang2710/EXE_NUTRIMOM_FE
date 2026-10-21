import { ApiClientError } from './api-error.ts'

/** A 429 never schedules a retry. Query changes cannot bypass its deadline. */
export function createRateLimitGuard(now = Date.now) {
  const limits = new Map<string, { until: number; error: ApiClientError }>()
  return {
    key(scope: string, method: string, path: string) {
      return JSON.stringify([scope, method.toUpperCase(), path.split('?')[0]])
    },
    assertAvailable(key: string) {
      const limit = limits.get(key)
      if (!limit) return
      const remaining = limit.until - now()
      if (remaining <= 0) {
        limits.delete(key)
        return
      }
      throw new ApiClientError(429, {
        code: limit.error.code,
        message: limit.error.serverMessage,
        fields: limit.error.fields,
        retryable: limit.error.retryable,
        request_id: limit.error.requestId,
      }, remaining)
    },
    record(key: string, error: ApiClientError) {
      if (error.status !== 429) return
      for (const [storedKey, limit] of limits) {
        if (limit.until <= now()) limits.delete(storedKey)
      }
      const until = now() + Math.max(1000, error.retryAfterMs ?? 30_000)
      if (until >= (limits.get(key)?.until ?? 0)) limits.set(key, { until, error })
    },
    clear() { limits.clear() },
  }
}
