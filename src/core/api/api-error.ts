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

const friendlyMessages: Record<string, string> = {
  INVALID_PHONE: 'Số điện thoại chưa hợp lệ.',
  PHONE_ALREADY_EXISTS: 'Số điện thoại này đã được đăng ký.',
  ACCOUNT_NOT_FOUND: 'Không tìm thấy tài khoản.',
  TERMS_NOT_ACCEPTED: 'Vui lòng đồng ý với điều khoản sử dụng.',
  OTP_RESEND_TOO_SOON: 'Vui lòng chờ trước khi gửi lại mã OTP.',
  INVALID_OTP: 'Mã OTP chưa đúng. Vui lòng thử lại.',
  OTP_EXPIRED: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.',
  OTP_ATTEMPTS_EXCEEDED: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
  OTP_CHALLENGE_USED: 'Mã OTP này đã được sử dụng.',
  INVALID_CREDENTIALS: 'Số điện thoại hoặc mật khẩu chưa đúng.',
  INVALID_REFRESH_TOKEN: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  UNAUTHORIZED: 'Vui lòng đăng nhập để tiếp tục.',
  VALIDATION_ERROR: 'Vui lòng kiểm tra lại thông tin đã nhập.',
  VERSION_CONFLICT: 'Dữ liệu đã thay đổi ở nơi khác. Vui lòng tải lại.',
  OTP_PROVIDER_NOT_CONFIGURED: 'Dịch vụ OTP chưa được cấu hình. Vui lòng liên hệ nhóm phát triển.',
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly fields: Record<string, string>
  readonly retryable: boolean
  readonly requestId?: string

  constructor(status: number, error: ApiErrorBody) {
    super(friendlyMessages[error.code] || error.message || 'Không thể kết nối với máy chủ.')
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
