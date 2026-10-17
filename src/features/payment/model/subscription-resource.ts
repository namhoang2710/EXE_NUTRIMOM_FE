import { ApiClientError } from '../../../core/api/api-error.ts'

export interface ReadSnapshot<T> {
  data: T | null
  loading: boolean
  error: Error | null
  retryAt: number
}

/** Shared reads only. Failures never schedule retries or replay a write. */
export function createSubscriptionResource<T>(ttlMs: number, now = Date.now) {
  type Entry = { snapshot: ReadSnapshot<T>; expires: number; pending?: Promise<T> }
  const empty: ReadSnapshot<T> = { data: null, loading: false, error: null, retryAt: 0 }
  const entries = new Map<string, Entry>()
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    snapshot(key: string) { return entries.get(key)?.snapshot ?? empty },
    clear() { entries.clear(); emit() },
    invalidate(key: string) {
      const entry = entries.get(key)
      if (entry) entries.set(key, { snapshot: { ...entry.snapshot, loading: false }, expires: 0 })
    },
    load(key: string, loader: () => Promise<T>, force = false): Promise<T> {
      let entry = entries.get(key)
      if (entry?.pending) return entry.pending
      if (entry && entry.snapshot.retryAt > now()) return Promise.reject(entry.snapshot.error)
      if (entry && !force) {
        if (entry.snapshot.error) return Promise.reject(entry.snapshot.error)
        if (entry.snapshot.data !== null && entry.expires > now()) return Promise.resolve(entry.snapshot.data)
      }
      entry ??= { snapshot: empty, expires: 0 }
      entries.set(key, entry)
      const current = entry
      current.snapshot = { ...current.snapshot, loading: true, error: null, retryAt: 0 }
      const pending = Promise.resolve().then(loader).then((data) => {
        if (entries.get(key) === current) {
          current.expires = now() + ttlMs
          current.snapshot = { data, loading: false, error: null, retryAt: 0 }
        }
        return data
      }, (reason: unknown) => {
        const error = reason instanceof Error ? reason : new Error('Không thể tải thông tin gói.')
        if (entries.get(key) === current) {
          const cooldown = reason instanceof ApiClientError && reason.status === 429
            ? Math.max(1_000, reason.retryAfterMs ?? 30_000) : 5_000
          current.snapshot = { ...current.snapshot, loading: false, error, retryAt: now() + cooldown }
        }
        throw error
      }).finally(() => {
        if (entries.get(key) === current) { current.pending = undefined; emit() }
      })
      current.pending = pending
      emit()
      return pending
    },
  }
}
