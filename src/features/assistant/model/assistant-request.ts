import { ApiClientError } from '../../../core/api/api-error.ts'

export const ASSISTANT_RATE_LIMIT_MESSAGE = 'NutriMom đang nhận nhiều câu hỏi. Bạn vui lòng chờ một chút rồi thử lại.'
const DEFAULT_RATE_LIMIT_DELAY_MS = 5_000

export interface AssistantSendGate {
  tryAcquire: (content: string) => string | null
  release: () => void
  reset: () => void
  isLocked: () => boolean
}

export function createAssistantSendGate(): AssistantSendGate {
  let locked = false
  return {
    tryAcquire(content) {
      const trimmed = content.trim()
      if (!trimmed || locked) return null
      locked = true
      return trimmed
    },
    release() { locked = false },
    reset() { locked = false },
    isLocked() { return locked },
  }
}

export function assistantErrorMessage(cause: unknown) {
  if (cause instanceof ApiClientError && cause.status === 429) return ASSISTANT_RATE_LIMIT_MESSAGE
  return cause instanceof Error ? cause.message : 'Không thể tải trợ lý. Vui lòng thử lại.'
}

export function assistantCanRetry(cause: unknown) {
  return cause instanceof ApiClientError && (cause.status === 429 || cause.retryable)
}

export function assistantRetryAvailableAt(cause: unknown, now = Date.now()) {
  if (!(cause instanceof ApiClientError) || cause.status !== 429) return 0
  return now + (cause.retryAfterMs ?? DEFAULT_RATE_LIMIT_DELAY_MS)
}
