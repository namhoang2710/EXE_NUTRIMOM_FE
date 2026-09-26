import { ApiClientError } from '../../../core/api/api-error.ts'
import { ErrorCodes } from '../../../core/api/error-code.ts'

export function isSlotUnavailableError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && error.code === ErrorCodes.slotUnavailable
}

export const SLOT_CONFLICT_MESSAGE = 'Khung giờ này vừa được người khác đặt. Vui lòng chọn khung giờ khác.'
export const UNKNOWN_CONSULTATION_ERROR = 'Không thể xử lý yêu cầu lúc này. Vui lòng thử lại.'

export function consultationErrorMessage(error: unknown) {
  if (!(error instanceof ApiClientError)) return UNKNOWN_CONSULTATION_ERROR
  if (error.code === 'VALIDATION_ERROR') {
    return Object.values(error.fields)[0] || error.serverMessage || error.message
  }
  if (error.status === 0) return error.message
  return UNKNOWN_CONSULTATION_ERROR
}
