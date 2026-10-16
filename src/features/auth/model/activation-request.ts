import { ApiClientError } from '../../../core/api/api-error.ts'
import { ErrorCodes } from '../../../core/api/error-code.ts'

/**
 * Activation codes are single-use on the backend, so the same code must only be sent once.
 * React StrictMode runs the page effect twice in development; both runs share this request.
 */
const inFlight = new Map<string, Promise<unknown>>()

export function activateOnce<T>(token: string, email: string | undefined, run: () => Promise<T>): Promise<T> {
  const key = `${token}|${(email ?? '').trim().toLowerCase()}`
  const pending = inFlight.get(key) as Promise<T> | undefined
  if (pending) return pending
  const request = run().finally(() => inFlight.delete(key))
  inFlight.set(key, request)
  return request
}

/** True when the backend rejected the code as wrong or already used (account may already be active). */
export function isUsedOrInvalidActivation(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === ErrorCodes.invalidActivationToken
}

export function activationErrorMessage(error: unknown, fallback: string): string {
  if (isUsedOrInvalidActivation(error)) {
    return 'Mã kích hoạt không đúng hoặc đã được sử dụng. Nếu tài khoản của bạn đã kích hoạt, hãy đăng nhập.'
  }
  return error instanceof ApiClientError ? error.message : fallback
}
