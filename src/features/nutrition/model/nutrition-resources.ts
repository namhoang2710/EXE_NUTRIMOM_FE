import { ApiClientError } from '../../../core/api/api-error.ts'
import { createConcurrencyPool } from '../../../core/api/concurrency-pool.ts'
import {
  createResourceCache,
  forConsumer,
} from '../../../core/api/resource-cache.ts'

export type NutritionRequestGroup = 'catalog' | 'personal'
export const nutritionTtl = {
  catalog: 300_000,
  allergens: 1_800_000,
  profile: 30_000,
  live: 15_000,
  suggestions: 30_000,
}

/** Memory-only cache. A cancelled consumer never aborts another consumer's request. */
export function createNutritionResources(now: () => number = Date.now) {
  const caches = new Map<number, ReturnType<typeof createResourceCache>>()
  const cooldowns = new Map<
    NutritionRequestGroup,
    { until: number; error: ApiClientError }
  >()
  const listeners = new Set<() => void>()
  const consumers = new Map<string, Set<{ signal?: AbortSignal }>>()
  const pool = createConcurrencyPool(3)
  function cache(ttl: number) {
    let value = caches.get(ttl)
    if (!value) {
      value = createResourceCache(ttl, now)
      caches.set(ttl, value)
    }
    return value
  }
  function guard(group: NutritionRequestGroup) {
    const cooldown = cooldowns.get(group)
    if (cooldown && cooldown.until > now()) throw cooldown.error
  }
  function failed(group: NutritionRequestGroup, reason: unknown): never {
    if (reason instanceof ApiClientError && reason.status === 429) {
      const until = now() + Math.max(1000, reason.retryAfterMs ?? 30_000)
      cooldowns.set(group, {
        until: Math.max(until, cooldowns.get(group)?.until ?? 0),
        error: reason,
      })
      listeners.forEach((listener) => listener())
    }
    throw reason
  }
  return {
    peek<T>(key: string, ttl: number) {
      return cache(ttl).peek<T>(key)
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    retryAt(group: NutritionRequestGroup) {
      return cooldowns.get(group)?.until ?? 0
    },
    async read<T>(
      key: string,
      load: () => Promise<T>,
      ttl: number,
      group: NutritionRequestGroup,
      signal?: AbortSignal,
      fresh = false,
    ): Promise<T> {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const resource = cache(ttl)
      if (fresh) resource.expire(key)
      const consumerKey = `${ttl}:${key}`
      const consumer = { signal }
      const waiting =
        consumers.get(consumerKey) || new Set<{ signal?: AbortSignal }>()
      waiting.add(consumer)
      consumers.set(consumerKey, waiting)
      const promise = resource.run(key, () =>
        pool(async () => {
          // A filter/date change may remove every consumer while this read is queued.
          if (![...waiting].some((item) => !item.signal?.aborted))
            throw new DOMException('Aborted', 'AbortError')
          // Queued reads must also honour a limit discovered by an earlier request.
          guard(group)
          try {
            return await load()
          } catch (reason) {
            return failed(group, reason)
          }
        }),
      )
      try {
        return await forConsumer(promise, signal)
      } finally {
        waiting.delete(consumer)
        if (!waiting.size && consumers.get(consumerKey) === waiting)
          consumers.delete(consumerKey)
      }
    },
    async write<T>(
      load: () => Promise<T>,
      group: NutritionRequestGroup = 'personal',
    ): Promise<T> {
      guard(group)
      try {
        return await load()
      } catch (reason) {
        return failed(group, reason)
      }
    },
    seed<T>(key: string, value: T, ttl: number) {
      cache(ttl).set(key, value)
    },
    invalidate(prefix: string) {
      for (const value of caches.values()) value.invalidate(prefix)
    },
    clear() {
      for (const value of caches.values()) value.clear()
      cooldowns.clear()
      listeners.forEach((listener) => listener())
    },
  }
}
