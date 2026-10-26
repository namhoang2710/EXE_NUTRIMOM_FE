export function createNotificationRequestCoordinator() {
  let active = true
  let sequence = 0
  let inFlightKey: string | undefined

  return {
    setup() { active = true },
    cleanup() { active = false; sequence += 1; inFlightKey = undefined },
    invalidate() { sequence += 1; inFlightKey = undefined },
    canStart(key: string) { return inFlightKey !== key },
    start(key: string) { sequence += 1; inFlightKey = key; return sequence },
    isCurrent(requestId: number) { return active && sequence === requestId },
    finish(requestId: number) {
      if (sequence !== requestId) return false
      inFlightKey = undefined
      return active
    },
    isActive() { return active },
  }
}

export async function commitNotificationAction<T>(
  request: () => Promise<T>,
  shouldCommit: () => boolean,
  commit: (result: T) => void,
) {
  const result = await request()
  if (shouldCommit()) commit(result)
  return result
}

export function createNotificationMutationCoordinator() {
  const reads = new Map<string, Promise<unknown>>()
  let readAll: Promise<unknown> | undefined
  return {
    runRead<T>(id: string, action: () => Promise<T>): Promise<T> {
      const existing = reads.get(id)
      if (existing) return existing as Promise<T>
      const pending = action().finally(() => { if (reads.get(id) === pending) reads.delete(id) })
      reads.set(id, pending)
      return pending
    },
    runReadAll<T>(action: () => Promise<T>): Promise<T> {
      if (readAll) return readAll as Promise<T>
      const pending = action().finally(() => { if (readAll === pending) readAll = undefined })
      readAll = pending
      return pending
    },
  }
}
