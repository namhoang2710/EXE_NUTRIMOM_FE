export const ErrorCodes = {
  networkError: 'NETWORK_ERROR',
  requestAborted: 'REQUEST_ABORTED',
  requestFailed: 'REQUEST_FAILED',
  requestTimeout: 'REQUEST_TIMEOUT',
  sessionExpired: 'SESSION_EXPIRED',
  slotUnavailable: 'SLOT_UNAVAILABLE',
  contactRequestLimitReached: 'CONTACT_REQUEST_LIMIT_REACHED',
  invalidContactRequestState: 'INVALID_CONTACT_REQUEST_STATE',
  invalidActivationToken: 'INVALID_ACTIVATION_TOKEN',
} as const

export type KnownErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
export type ErrorCode = KnownErrorCode | (string & {})
