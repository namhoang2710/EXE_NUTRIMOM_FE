import { ApiClientError } from '@/core/api/api-error'
import { ErrorCodes } from '@/core/api/error-code'

export function isSlotUnavailableError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && error.code === ErrorCodes.slotUnavailable
}
