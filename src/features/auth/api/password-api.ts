import { apiClient } from '../../../core/api/api-client.ts'
import { forConsumer } from '../../../core/api/resource-cache.ts'
import { createFeatureCooldown } from '../../../core/api/feature-cooldown.ts'

export const passwordCooldown = createFeatureCooldown()
const flights = new Map<string, Promise<unknown>>()
export async function publicAuthRequest<T>(group: 'email-send' | 'code-verify', path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  passwordCooldown.assert(group)
  const key = `${path}:${JSON.stringify(body)}`
  let pending = flights.get(key)
  if (!pending) {
    pending = apiClient.request<T>(path, { authenticated: false, retryAfterRefresh: false, method: 'POST', body: JSON.stringify(body) })
      .catch(error => { passwordCooldown.record(group, error); throw error })
      .finally(() => flights.delete(key))
    flights.set(key, pending)
  }
  return forConsumer(pending as Promise<T>, signal)
}
export interface ResetValidation { valid: true; expires_at: string; email_masked: string }
export const passwordApi = {
  forgot: (email: string) => publicAuthRequest<{ accepted: boolean; message: string }>('email-send', '/auth/password/forgot', { email: email.trim() }),
  validate: (token: string, signal?: AbortSignal) => publicAuthRequest<ResetValidation>('code-verify', '/auth/password/reset/validate', { token }, signal),
  reset: (token: string, password: string) => publicAuthRequest<{ reset: boolean; message: string }>('code-verify', '/auth/password/reset', { token, new_password: password }),
  change: (currentPassword: string, newPassword: string) => apiClient.request<void>('/auth/password/change', { method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) }),
}
