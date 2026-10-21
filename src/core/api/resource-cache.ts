export class StaleResourceError extends Error {
  constructor() {
    super('Dữ liệu đã thay đổi. Vui lòng tải lại.')
    this.name = 'StaleResourceError'
  }
}

interface Entry {
  expires: number
  value?: unknown
  pending?: Promise<unknown>
}

/** Memory only. Invalidating an entry also prevents its pending response from being published. */
export function createResourceCache(ttlMs = 30_000, now = Date.now) {
  const entries = new Map<string, Entry>()
  return {
    peek<T>(key: string): T | undefined {
      const entry = entries.get(key)
      return entry && entry.expires > now() ? (entry.value as T) : undefined
    },
    run<T>(key: string, load: () => Promise<T>): Promise<T> {
      for (const [storedKey, entry] of entries)
        if (!entry.pending && entry.expires <= now()) entries.delete(storedKey)
      const existing = entries.get(key)
      if (existing?.pending) return existing.pending as Promise<T>
      if (existing && existing.expires > now())
        return Promise.resolve(existing.value as T)
      const entry: Entry = { expires: 0 }
      entries.set(key, entry)
      const pending = Promise.resolve()
        .then(() => {
          if (entries.get(key) !== entry) throw new StaleResourceError()
          return load()
        })
        .then(
          (value) => {
            if (entries.get(key) !== entry) throw new StaleResourceError()
            entry.value = value
            entry.expires = now() + ttlMs
            entry.pending = undefined
            return value
          },
          (reason: unknown) => {
            if (entries.get(key) === entry) entries.delete(key)
            throw reason
          },
        )
      entry.pending = pending
      return pending
    },
    set<T>(key: string, value: T) {
      entries.set(key, { value, expires: now() + ttlMs })
    },
    expire(key: string) {
      const entry = entries.get(key)
      if (entry && !entry.pending) entries.delete(key)
    },
    invalidate(prefix: string) {
      for (const key of entries.keys())
        if (key.startsWith(prefix)) entries.delete(key)
    },
    clear() {
      entries.clear()
    },
  }
}

/** A consumer may stop waiting without cancelling a request shared by other consumers. */
export function forConsumer<T>(
  request: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return request
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Aborted', 'AbortError'))
    if (signal.aborted) {
      void request.catch(() => undefined)
      abort()
      return
    }
    signal.addEventListener('abort', abort, { once: true })
    request
      .then((value) => {
        if (!signal.aborted) resolve(value)
      }, reject)
      .finally(() => signal.removeEventListener('abort', abort))
  })
}
