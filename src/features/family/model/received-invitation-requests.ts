const RECEIVED_CACHE_MS = 45_000
const PREVIEW_CACHE_MS = 30_000

export interface RequestLease<T> {
  promise: Promise<T>
  release: () => void
}

interface AcquireOptions {
  force?: boolean
}

interface SharedRequest<T> {
  controller: AbortController
  promise: Promise<T>
  consumers: number
  generation: number
  abortTimer?: ReturnType<typeof setTimeout>
}

export function createAbortableRequestCoordinator<T>(cacheMs: number, now: () => number = Date.now) {
  let generation = 0
  let cache: { value: T; expiresAt: number } | undefined
  let pending: SharedRequest<T> | undefined

  function acquire(request: (signal: AbortSignal) => Promise<T>, options: AcquireOptions = {}): RequestLease<T> {
    if (!options.force && cache && now() < cache.expiresAt) {
      return { promise: Promise.resolve(cache.value), release: () => undefined }
    }

    if (pending) {
      pending.consumers += 1
      if (pending.abortTimer !== undefined) {
        clearTimeout(pending.abortTimer)
        pending.abortTimer = undefined
      }
      const shared = pending
      return lease(shared)
    }

    const controller = new AbortController()
    const requestGeneration = generation
    const shared = {
      controller,
      consumers: 1,
      generation: requestGeneration,
      promise: Promise.resolve(undefined as T),
    } as SharedRequest<T>
    let response: Promise<T>
    try { response = request(controller.signal) }
    catch (reason) { response = Promise.reject(reason) }
    shared.promise = response
      .then((value) => {
        if (!controller.signal.aborted && generation === requestGeneration) {
          cache = { value, expiresAt: now() + cacheMs }
        }
        return value
      })
      .finally(() => {
        if (pending === shared) pending = undefined
      })
    pending = shared
    return lease(shared)
  }

  function lease(shared: SharedRequest<T>): RequestLease<T> {
    let released = false
    return {
      promise: shared.promise,
      release: () => {
        if (released) return
        released = true
        release(shared)
      },
    }
  }

  function release(shared: SharedRequest<T>) {
    shared.consumers = Math.max(0, shared.consumers - 1)
    if (shared.consumers || pending !== shared || shared.abortTimer !== undefined) return
    // React Strict Mode tears an effect down and recreates it synchronously. A
    // zero-delay grace period lets the replay reuse the same request while a
    // real unmount still cancels work that no page consumes.
    shared.abortTimer = setTimeout(() => {
      shared.abortTimer = undefined
      if (pending === shared && shared.consumers === 0) {
        pending = undefined
        shared.controller.abort()
      }
    }, 0)
  }

  return {
    acquire,
    invalidate() {
      generation += 1
      cache = undefined
      if (pending) {
        if (pending.abortTimer !== undefined) clearTimeout(pending.abortTimer)
        pending.controller.abort()
        pending = undefined
      }
    },
    replace(value: T) {
      generation += 1
      cache = { value, expiresAt: now() + cacheMs }
    },
    snapshot() { return cache?.value },
  }
}

export const receivedInvitationRequests = createAbortableRequestCoordinator<import('./family-types').ReceivedFamilyInvitation[]>(RECEIVED_CACHE_MS)

export function createInvitationPreviewRequestCoordinator(cacheMs = PREVIEW_CACHE_MS) {
  const requests = new Map<string, ReturnType<typeof createAbortableRequestCoordinator<import('./family-types').FamilyInvitationPreview>>>()
  return {
    acquire(id: string, request: (signal: AbortSignal) => Promise<import('./family-types').FamilyInvitationPreview>) {
      let coordinator = requests.get(id)
      if (!coordinator) {
        coordinator = createAbortableRequestCoordinator(cacheMs)
        requests.set(id, coordinator)
      }
      return coordinator.acquire(request)
    },
    invalidate(id?: string) {
      if (id) {
        requests.get(id)?.invalidate()
        requests.delete(id)
        return
      }
      requests.forEach((coordinator) => coordinator.invalidate())
      requests.clear()
    },
  }
}

export const invitationPreviewRequests = createInvitationPreviewRequestCoordinator()
