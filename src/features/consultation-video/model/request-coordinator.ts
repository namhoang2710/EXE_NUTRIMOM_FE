import { ApiClientError } from '../../../core/api/api-error.ts'

export type VideoAction = 'info' | 'join' | 'complete'

interface Flight<T = unknown> {
  controller: AbortController
  promise: Promise<CoordinatedResult<T>>
}

export interface CoordinatedResult<T> {
  value: T
  stale: boolean
}

export class VideoCooldownError extends Error {
  readonly action: VideoAction
  readonly retryAt: number
  override readonly cause?: unknown

  constructor(
    action: VideoAction,
    retryAt: number,
    cause?: unknown,
  ) {
    super('Thao tác đang tạm khóa do gửi quá nhiều yêu cầu.')
    this.name = 'VideoCooldownError'
    this.action = action
    this.retryAt = retryAt
    this.cause = cause
  }
}

const keyFor = (requestId: string, action: VideoAction) => `${requestId}:${action}`

export class VideoRequestCoordinator {
  private readonly flights = new Map<string, Flight>()
  private readonly cooldowns = new Map<string, number>()
  private readonly revisions = new Map<string, number>()
  private readonly clock: () => number

  constructor(clock: () => number = Date.now) { this.clock = clock }

  run<T>(requestId: string, action: VideoAction, task: (signal: AbortSignal) => Promise<T>, now = this.clock()) {
    const key = keyFor(requestId, action)
    const retryAt = this.cooldowns.get(key) ?? 0
    if (retryAt > now) return Promise.reject(new VideoCooldownError(action, retryAt))
    if (retryAt) this.cooldowns.delete(key)

    const current = this.flights.get(key) as Flight<T> | undefined
    if (current) return current.promise

    const revision = this.revisions.get(requestId) ?? 0
    const controller = new AbortController()
    const promise = Promise.resolve()
      .then(() => task(controller.signal))
      .then((value) => ({ value, stale: revision !== (this.revisions.get(requestId) ?? 0) }))
      .catch((error: unknown) => {
        if (error instanceof ApiClientError && error.status === 429) {
          const deadline = this.clock() + (error.retryAfterMs ?? 30_000)
          this.cooldowns.set(key, deadline)
          throw new VideoCooldownError(action, deadline, error)
        }
        throw error
      })
      .finally(() => {
        if (this.flights.get(key)?.promise === promise) this.flights.delete(key)
      })
    this.flights.set(key, { controller, promise })
    return promise
  }

  cooldownRemaining(requestId: string, action: VideoAction, now = this.clock()) {
    return Math.max(0, (this.cooldowns.get(keyFor(requestId, action)) ?? 0) - now)
  }

  dispose(requestId: string) {
    this.revisions.set(requestId, (this.revisions.get(requestId) ?? 0) + 1)
    for (const action of ['info', 'join', 'complete'] as const) {
      const key = keyFor(requestId, action)
      this.flights.get(key)?.controller.abort()
      this.flights.delete(key)
    }
  }
}

export const videoRequestCoordinator = new VideoRequestCoordinator()
