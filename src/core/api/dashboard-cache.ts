import { getSession, getSessionScope } from '../auth/token-store.ts'
import { StaleResourceError } from './resource-cache.ts'
import { ApiClientError } from './api-error.ts'

const prefix = 'nutrimom.dashboard.v1:'
export const dashboardTtlMs = 5 * 60_000
const localDay = (time: number) =>
  new Date(time + 7 * 3600_000).toISOString().slice(0, 10)
interface Snapshot<T> {
  expires: number
  day: string
  data: T
}
interface Entry {
  snapshot?: Snapshot<unknown>
  pending?: Promise<unknown>
}

/** A reload shares the same short-lived snapshot. New logins and logout clear it. */
export function createDashboardCache(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  identity: () => { account: string; scope: string },
  now = Date.now,
) {
  const entries = new Map<string, Entry>()
  const cooldowns = new Map<string, { until: number; error: ApiClientError }>()
  const storageKey = (account: string, resource: string) =>
    prefix + JSON.stringify([account, resource])
  const fresh = (value: Snapshot<unknown>) =>
    value.expires > now() &&
    value.expires <= now() + dashboardTtlMs &&
    value.day === localDay(now())
  function peek<T>(resource: string): T | null {
    const { account, scope } = identity()
    if (!account) return null
    const key = JSON.stringify([scope, resource]),
      cached = entries.get(key)?.snapshot
    if (cached && fresh(cached)) return cached.data as T
    try {
      const raw = storage.getItem(storageKey(account, resource))
      if (!raw) return null
      const value = JSON.parse(raw) as Snapshot<T>
      if (
        !value ||
        !fresh(value) ||
        !value.data ||
        typeof value.data !== 'object' ||
        Array.isArray(value.data)
      ) {
        storage.removeItem(storageKey(account, resource))
        return null
      }
      entries.set(key, { snapshot: value })
      return value.data
    } catch {
      return null
    }
  }
  function read<T>(resource: string, load: () => Promise<T>): Promise<T> {
    const { account, scope } = identity(),
      key = JSON.stringify([scope, resource])
    let cooldown = cooldowns.get(key)
    if (!cooldown && account) {
      try {
        const raw = storage.getItem(storageKey(account, resource) + ':retry')
        const retry = raw
          ? (JSON.parse(raw) as {
              until: number
              code: string
              message: string
            })
          : null
        if (
          retry &&
          Number.isFinite(retry.until) &&
          retry.until > now() &&
          typeof retry.code === 'string' &&
          typeof retry.message === 'string'
        ) {
          cooldown = {
            until: retry.until,
            error: new ApiClientError(
              429,
              { code: retry.code, message: retry.message },
              retry.until - now(),
            ),
          }
          cooldowns.set(key, cooldown)
        }
      } catch {
        /* Memory protection still works when storage is unavailable. */
      }
    }
    if (cooldown && cooldown.until > now())
      return Promise.reject(cooldown.error)
    cooldowns.delete(key)
    const pending = entries.get(key)?.pending
    if (pending) return pending as Promise<T>
    const cached = peek<T>(resource)
    if (cached) return Promise.resolve(cached)
    const entry: Entry = {}
    entries.set(key, entry)
    const request = Promise.resolve()
      .then(() => {
        if (identity().scope !== scope || entries.get(key) !== entry)
          throw new StaleResourceError()
        return load()
      })
      .then((data) => {
        if (entries.get(key) !== entry || identity().scope !== scope)
          throw new StaleResourceError()
        const snapshot = {
          data,
          expires: now() + dashboardTtlMs,
          day: localDay(now()),
        }
        entry.snapshot = snapshot
        entry.pending = undefined
        try {
          storage.removeItem(storageKey(account, resource) + ':retry')
          if (account)
            storage.setItem(
              storageKey(account, resource),
              JSON.stringify(snapshot),
            )
        } catch {
          /* Memory caching still works when storage is unavailable. */
        }
        return data
      })
      .catch((error: unknown) => {
        if (entries.get(key) === entry) {
          entries.delete(key)
          if (
            error instanceof ApiClientError &&
            error.status === 429 &&
            identity().scope === scope
          ) {
            const until = now() + Math.max(1000, error.retryAfterMs ?? 30_000)
            cooldowns.set(key, { until, error })
            try {
              if (account)
                storage.setItem(
                  storageKey(account, resource) + ':retry',
                  JSON.stringify({
                    until,
                    code: error.code,
                    message: error.serverMessage || error.message,
                  }),
                )
            } catch {
              /* No repeated requests within this page even without storage. */
            }
          }
        }
        throw error
      })
    entry.pending = request
    return request
  }
  function invalidate() {
    entries.clear()
    const { account } = identity()
    for (const resource of ['mom', 'partner']) {
      try {
        storage.removeItem(storageKey(account, resource))
      } catch {
        /* Storage may be disabled. */
      }
    }
  }
  return {
    peek,
    read,
    invalidate,
    clear() {
      invalidate()
      cooldowns.clear()
      for (const resource of ['mom', 'partner']) {
        try {
          storage.removeItem(
            storageKey(identity().account, resource) + ':retry',
          )
        } catch {
          /* Storage may be disabled. */
        }
      }
    },
  }
}

// Access storage lazily so isolated model tests and SSR do not need a browser.
const storage = {
  getItem: (key: string) => sessionStorage.getItem(key),
  setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
  removeItem: (key: string) => sessionStorage.removeItem(key),
}
export const dashboardCache = createDashboardCache(storage, () => ({
  account: getSession()?.user.id ?? '',
  scope: getSessionScope(),
}))
export function invalidateDashboards() {
  dashboardCache.invalidate()
}
if (typeof window !== 'undefined') {
  const clear = () => {
    dashboardCache.clear()
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i)
        if (key?.startsWith(prefix)) sessionStorage.removeItem(key)
      }
    } catch {
      /* No persistent cache when storage is unavailable. */
    }
  }
  window.addEventListener('nutrimom:session-cleared', clear)
  window.addEventListener('nutrimom:session-changed', clear)
}
