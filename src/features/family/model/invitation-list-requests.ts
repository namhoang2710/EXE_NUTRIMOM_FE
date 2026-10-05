const INVITATION_LIST_CACHE_MS = 60_000
const INVITATION_RATE_LIMIT_COOLDOWN_MS = 30_000

interface LoadOptions {
  force?: boolean
}

function isRateLimitError(reason: unknown) {
  return Boolean(reason && typeof reason === 'object' && 'status' in reason && reason.status === 429)
}

function retryDelay(reason: unknown, fallback: number) {
  if (!reason || typeof reason !== 'object' || !('retryAfterMs' in reason)) return fallback
  const value = reason.retryAfterMs
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

export function formatInvitationRetryCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0')
  const seconds = (safeSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function createInvitationListRequestCoordinator<T>(
  cacheMs = INVITATION_LIST_CACHE_MS,
  rateLimitCooldownMs = INVITATION_RATE_LIMIT_COOLDOWN_MS,
  now: () => number = Date.now,
) {
  let pending: Promise<T> | undefined
  let cached: { value: T; expiresAt: number } | undefined
  let blockedUntil = 0
  let rateLimitError: unknown
  let pendingMutations: Array<(value: T) => T> = []

  return {
    load(request: () => Promise<T>, options: LoadOptions = {}) {
      const currentTime = now()
      if (pending) return pending
      if (!options.force && cached && currentTime < cached.expiresAt) return Promise.resolve(cached.value)
      // Keep serving the last usable snapshot while the backend asks the client
      // to cool down. This prevents a refresh from replacing valid UI with 429.
      if (currentTime < blockedUntil) {
        if (!options.force && cached) return Promise.resolve(cached.value)
        return Promise.reject(rateLimitError)
      }

      pendingMutations = []
      const current = request()
        .then((value) => {
          const latest = pendingMutations.reduce((result, update) => update(result), value)
          cached = { value: latest, expiresAt: now() + cacheMs }
          blockedUntil = 0
          rateLimitError = undefined
          return latest
        })
        .catch((reason: unknown) => {
          if (isRateLimitError(reason)) {
            blockedUntil = now() + retryDelay(reason, rateLimitCooldownMs)
            rateLimitError = reason
          }
          throw reason
        })
        .finally(() => {
          if (pending === current) {
            pending = undefined
            pendingMutations = []
          }
        })

      pending = current
      return current
    },
    invalidate() {
      cached = undefined
    },
    mutate(update: (value: T) => T) {
      if (cached) cached = { value: update(cached.value), expiresAt: now() + cacheMs }
      if (pending) pendingMutations.push(update)
    },
    replace(value: T) {
      cached = { value, expiresAt: now() + cacheMs }
      if (pending) pendingMutations.push(() => value)
    },
    isCoolingDown() {
      return now() < blockedUntil
    },
    remainingMs() {
      return Math.max(0, blockedUntil - now())
    },
    snapshot() {
      return cached?.value
    },
  }
}

export const invitationListRequests = createInvitationListRequestCoordinator<import('./family-types').FamilyInvitationSummary[]>()
