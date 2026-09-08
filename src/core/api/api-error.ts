import { ErrorCodes, type ErrorCode } from './error-code'

export interface ApiErrorBody {
  code: ErrorCode
  message: string
  fields?: Record<string, string>
  retryable?: boolean
  request_id?: string
}

export interface ApiErrorResponse {
  error: ApiErrorBody
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly fields: Record<string, string>
  readonly retryable: boolean
  readonly requestId?: string

  constructor(status: number, error: ApiErrorBody) {
    super(error.message || 'Không thể kết nối với máy chủ.')
    this.name = 'ApiClientError'
    this.status = status
    this.code = error.code || ErrorCodes.requestFailed
    this.fields = error.fields || {}
    this.retryable = Boolean(error.retryable)
    this.requestId = error.request_id
  }
}

export async function parseApiError(response: Response) {
  try {
    const payload = (await response.json()) as Partial<ApiErrorResponse>
    if (payload.error) return new ApiClientError(response.status, payload.error)
  } catch {
    // Fall through to a readable error for non-JSON responses.
  }

  return new ApiClientError(response.status, {
    code: ErrorCodes.requestFailed,
    message: response.status >= 500
      ? 'Máy chủ đang bận. Vui lòng thử lại sau.'
      : 'Yêu cầu chưa được xử lý. Vui lòng kiểm tra lại thông tin.',
  })
}
