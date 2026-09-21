export const ErrorCodes = {
  networkError: 'NETWORK_ERROR',
  requestAborted: 'REQUEST_ABORTED',
  requestFailed: 'REQUEST_FAILED',
  requestTimeout: 'REQUEST_TIMEOUT',
  sessionExpired: 'SESSION_EXPIRED',
  slotUnavailable: 'SLOT_UNAVAILABLE',
} as const

export type KnownErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
export type ErrorCode = KnownErrorCode | (string & {})
