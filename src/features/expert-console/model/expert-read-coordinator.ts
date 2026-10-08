import { ApiClientError } from '../../../core/api/api-error.ts'

const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 30_000

function abortedRequest() {
  const error = new Error('Request aborted')
  error.name = 'AbortError'
  return error
}

function followWithSignal<T>(request: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return request
  if (signal.aborted) return Promise.reject(abortedRequest())

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(abortedRequest())
    signal.addEventListener('abort', abort, { once: true })
    void request.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

export function createExpertReadCoordinator(
  fallbackCooldownMs = DEFAULT_RATE_LIMIT_COOLDOWN_MS,
  now: () => number = Date.now,
) {
  const pending = new Map<string, Promise<unknown>>()
  let blockedUntil = 0
  let rateLimitError: ApiClientError | null = null

  return {
    run<T>(key: string, request: () => Promise<T>, signal?: AbortSignal): Promise<T> {
      const existing = pending.get(key) as Promise<T> | undefined
      if (existing) return followWithSignal(existing, signal)
      if (now() < blockedUntil && rateLimitError) return followWithSignal(Promise.reject(rateLimitError), signal)

      const current = Promise.resolve()
        .then(request)
        .then((value) => {
          blockedUntil = 0
          rateLimitError = null
          return value
        })
        .catch((reason: unknown) => {
          if (reason instanceof ApiClientError && reason.status === 429) {
            const retryAfterMs = reason.retryAfterMs
            blockedUntil = now() + (retryAfterMs && retryAfterMs > 0 ? retryAfterMs : fallbackCooldownMs)
            rateLimitError = reason
          }
          throw reason
        })
        .finally(() => {
          if (pending.get(key) === current) pending.delete(key)
        })

      pending.set(key, current)
      return followWithSignal(current, signal)
    },
    isCoolingDown() {
      return now() < blockedUntil
    },
    remainingMs() {
      return Math.max(0, blockedUntil - now())
    },
    clear() {
      pending.clear()
      blockedUntil = 0
      rateLimitError = null
    },
  }
}

export const expertReadCoordinator = createExpertReadCoordinator()
