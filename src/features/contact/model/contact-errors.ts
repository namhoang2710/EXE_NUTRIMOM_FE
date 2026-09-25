import { ApiClientError } from '@/core/api/api-error'
import { ErrorCodes } from '@/core/api/error-code'

export function isContactLimitReached(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && error.code === ErrorCodes.contactRequestLimitReached
}

export function isInvalidContactState(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && error.code === ErrorCodes.invalidContactRequestState
}

export function isContactNotFound(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && error.status === 404
}

export function contactErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
