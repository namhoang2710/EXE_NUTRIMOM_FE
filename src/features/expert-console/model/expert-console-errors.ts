import { ApiClientError } from '../../../core/api/api-error.ts'

export const EXPERT_ACTION_FALLBACK = 'Không thể xử lý yêu cầu lúc này. Vui lòng thử lại.'
export const SLOT_UNAVAILABLE_MESSAGE = 'Khung giờ này không còn khả dụng. Vui lòng chọn khung giờ khác.'
export const REQUEST_ALREADY_CLAIMED_MESSAGE = 'Yêu cầu này vừa được chuyên gia khác tiếp nhận.'

export function isExpertApiError(error: unknown, code: string): error is ApiClientError {
  return error instanceof ApiClientError && error.code === code
}

export function expertActionErrorMessage(error: unknown, fallback = EXPERT_ACTION_FALLBACK) {
  if (!(error instanceof ApiClientError)) return fallback
  if (error.code === 'VALIDATION_ERROR') {
    return Object.values(error.fields)[0] || error.serverMessage || error.message || fallback
  }
  return error.serverMessage || error.message || fallback
}
