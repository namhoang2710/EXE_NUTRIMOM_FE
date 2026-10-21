import { ApiClientError } from '@/core/api/api-error'
import { ErrorCodes } from '@/core/api/error-code'

export interface FriendlyError {
  message: string
  /** Mốc (ms) trước đó không nên gửi lại — lấy từ Retry-After của 429. */
  retryAt: number
  status: number
  retryable: boolean
}

const byStatus: Record<number, string> = {
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Bài viết không còn tồn tại hoặc đã bị gỡ.',
  413: 'Ảnh vượt quá dung lượng cho phép (10 MB).',
}

export function isAbort(reason: unknown) {
  return reason instanceof ApiClientError && reason.status === 0 && reason.code === ErrorCodes.requestAborted
    || reason instanceof DOMException && reason.name === 'AbortError'
}

/** Chuyển lỗi API thành câu dễ hiểu; 429 kèm thời gian chờ, 5xx/mạng cho phép thử lại. */
export function friendlyError(reason: unknown, now = Date.now()): FriendlyError {
  if (reason instanceof ApiClientError) {
    if (reason.status === 429) {
      const waitMs = reason.retryAfterMs ?? 30_000
      const seconds = Math.max(1, Math.ceil(waitMs / 1000))
      // Hết quota 24 giờ: câu của BE đã đủ nghĩa. Còn lại (rate limit, ảnh đang bận): báo số giây cần chờ.
      const message = reason.code === 'QUOTA_EXCEEDED' && reason.serverMessage
        ? reason.serverMessage
        : `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${seconds} giây.`
      return { message, retryAt: now + waitMs, status: 429, retryable: true }
    }
    const message = byStatus[reason.status]
      || (reason.status >= 500 || reason.status === 0 ? 'Máy chủ đang gặp sự cố hoặc mất kết nối. Vui lòng thử lại.' : reason.message)
    return { message, retryAt: 0, status: reason.status, retryable: reason.status === 0 || reason.status >= 500 || reason.retryable }
  }
  return { message: 'Đã có lỗi xảy ra. Vui lòng thử lại.', retryAt: 0, status: 0, retryable: true }
}
