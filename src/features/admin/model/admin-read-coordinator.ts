import { ApiClientError } from '../../../core/api/api-error.ts'

/** Successful payloads only, bounded in memory. A lease belongs to one consumer. */
export function createAdminReadCoordinator(now: () => number = () => Date.now(), capacity = 20) {
  type Entry = { value: unknown; expires: number }
  type Flight = { controller: AbortController; promise: Promise<unknown>; consumers: number; stale?: boolean }
  const cache = new Map<string, Entry>()
  const flights = new Map<string, Flight>()
  const cooldowns = new Map<string, { until: number; error: unknown }>()
  let scope = ''
  let generation = 0
  let denied = false
  let realtimeBlockedUntil = 0
  let adminCooldown: { until: number; error: unknown } | null = null
  let notificationCooldown: { until: number; error: unknown } | null = null
  let notificationFailures = 0
  const notificationKey = (key: string) => /^(GET|POST):\/notifications(?:[/?]|$)/.test(key)
  const cooldownFor = (key: string) => notificationKey(key) ? notificationCooldown : key.startsWith('GET:/admin/') ? adminCooldown : cooldowns.get(key)
  const listeners = new Set<() => void>()
  const notify = () => queueMicrotask(() => listeners.forEach(listener => listener()))
  function clear() {
    generation++
    for (const flight of flights.values()) flight.controller.abort()
    flights.clear(); cache.clear(); cooldowns.clear()
    adminCooldown = null; notificationCooldown = null; notificationFailures = 0; realtimeBlockedUntil = 0; notify()
  }
  function recordFailure(key: string, reason: unknown) {
    if (!(reason instanceof ApiClientError)) return
    if (reason.status === 403 || (notificationKey(key) && reason.status === 401)) { clear(); denied = true }
    if (reason.status === 429) {
      const fallback = notificationKey(key) ? Math.min(300_000, 60_000 * 2 ** Math.min(notificationFailures++, 3)) + Math.floor(Math.random() * 3_000) : 30_000
      const next = { until: now() + (reason.retryAfterMs ?? fallback), error: reason }
      cooldowns.set(key, next)
      if (notificationKey(key)) notificationCooldown = { ...next, until: Math.max(next.until, notificationCooldown?.until ?? 0) }
      if (key.startsWith('GET:/admin/')) adminCooldown = { ...next, until: Math.max(next.until, adminCooldown?.until ?? 0) }
      while (cooldowns.size > capacity) cooldowns.delete(cooldowns.keys().next().value!)
      notify()
    }
  }
  return {
    setScope(next: string) { if (scope !== next) { clear(); scope = next; denied = false } },
    clear,
    deny() { clear(); denied = true },
    isDenied: () => denied,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    blockRealtime(until: number) { realtimeBlockedUntil = Math.max(realtimeBlockedUntil, until); notify() },
    cooldownUntil(key = 'GET:/admin/') { return Math.max(cooldownFor(key)?.until ?? 0, realtimeBlockedUntil) },
    assertAvailable(key: string) { if (denied) throw new Error('Bạn không đủ quyền truy cập Admin.'); if (now() < realtimeBlockedUntil) throw new ApiClientError(429, { code:'TOO_MANY_REQUESTS',message:'Vui lòng chờ trước khi thử lại.' },realtimeBlockedUntil-now()); const value = cooldownFor(key); if (value && now() < value.until) throw value.error },
    recordFailure,
    hasFlight: (key: string) => flights.has(key),
    isStale(key: string) { return !cache.has(key) || cache.get(key)!.expires <= now() },
    expire(prefix: string) {
      for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key)
      for (const [key, flight] of flights) if (key.startsWith(prefix)) flight.stale = true
    },
    invalidate(prefix: string) {
      for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key)
      for (const [key, flight] of flights) if (key.startsWith(prefix)) { flight.controller.abort(); flights.delete(key) }
    },
    read<T>(key: string, loader: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal, ttl = 30_000): Promise<T> {
      if (denied) return Promise.reject(new Error('Bạn không đủ quyền truy cập Admin.'))
      if (signal?.aborted) return Promise.reject(new DOMException('Đã hủy', 'AbortError'))
      if (now() < realtimeBlockedUntil) return Promise.reject(new ApiClientError(429, { code:'TOO_MANY_REQUESTS',message:'Vui lòng chờ trước khi thử lại.' },realtimeBlockedUntil-now()))
      const hit = cache.get(key)
      if (hit && hit.expires > now()) { cache.delete(key); cache.set(key, hit); return Promise.resolve(hit.value as T) }
      cache.delete(key)
      const cooldown = cooldownFor(key)
      if (cooldown && now() < cooldown.until) return Promise.reject(cooldown.error)
      cooldowns.delete(key)
      let flight = flights.get(key)
      if (!flight) {
        const controller = new AbortController()
        const startedGeneration = generation
        const created: Flight = { controller, consumers: 0, promise: Promise.resolve() }
        created.promise = Promise.resolve().then(() => {
          if (controller.signal.aborted) throw new DOMException('Đã hủy', 'AbortError')
          return loader(controller.signal)
        }).then((value) => {
          if (startedGeneration !== generation || controller.signal.aborted || flights.get(key) !== created) throw new DOMException('Phiên đã thay đổi', 'AbortError')
          cache.set(key, { value, expires: created.stale ? 0 : now() + ttl })
          if (notificationKey(key)) notificationFailures = 0
          while (cache.size > capacity) cache.delete(cache.keys().next().value!)
          return value
        }).catch((reason: unknown) => {
          if (startedGeneration === generation && !controller.signal.aborted) recordFailure(key, reason)
          throw reason
        }).finally(() => { if (flights.get(key) === created) flights.delete(key) })
        flight = created; flights.set(key, flight)
      }
      const lease = flight
      lease.consumers++
      return new Promise<T>((resolve, reject) => {
        let released = false
        const release = () => {
          if (released) return
          released = true; signal?.removeEventListener('abort', abort)
          lease.consumers--
          // React StrictMode setup/cleanup/setup can retain this same flight.
          queueMicrotask(() => { if (!lease.consumers && flights.get(key) === lease) { flights.delete(key); lease.controller.abort() } })
        }
        const abort = () => { release(); reject(new DOMException('Đã hủy', 'AbortError')) }
        signal?.addEventListener('abort', abort, { once: true })
        void lease.promise.then((value) => { if (!released) resolve(value as T); release() }, (reason) => { if (!released) reject(reason); release() })
      })
    },
    inspect: () => ({ cached: cache.size, inFlight: flights.size, scope }),
  }
}

export function canonicalAdminPath(path: string) {
  const [endpoint, search = ''] = path.split('?')
  const params = new URLSearchParams(search)
  for (const [key, value] of [...params]) {
    if (!value.trim()) params.delete(key)
    else if (key === 'q') params.set(key, value.trim())
  }
  params.sort()
  return `${endpoint}${params.size ? `?${params}` : ''}`
}
