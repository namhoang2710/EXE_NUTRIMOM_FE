import { refreshOnce } from '../../../core/api/api-client.ts'
import { parseApiError, ApiClientError } from '../../../core/api/api-error.ts'
import { getDeviceId } from '../../../core/auth/device.ts'
import { getSession, getSessionScope } from '../../../core/auth/token-store.ts'
import { env } from '../../../core/config/env.ts'

/** The JSON client and stream share the same refresh gate and token store. */
export async function openAdminRealtime(signal: AbortSignal): Promise<Response> {
  const scope = getSessionScope()
  for (let attempt = 0; attempt < 2; attempt++) {
    const session = getSession()
    if (signal.aborted || scope !== getSessionScope()) throw new DOMException('Session changed', 'AbortError')
    const response = await fetch(`${env.apiBaseUrl}/admin/realtime/stream`, {
      signal, cache: 'no-store', headers: {
        Accept: 'text/event-stream', 'Accept-Language': 'vi-VN',
        'X-Device-Id': getDeviceId(), 'X-Request-Id': crypto.randomUUID(),
        ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      },
    })
    if (signal.aborted || scope !== getSessionScope()) { void response.body?.cancel(); throw new DOMException('Session changed', 'AbortError') }
    if (response.status === 401 && attempt === 0 && (session !== getSession() || session?.refreshToken)) {
      await response.body?.cancel()
      if (session === getSession()) await refreshOnce()
      continue
    }
    if (!response.ok) throw await parseApiError(response)
    return response
  }
  throw new ApiClientError(401, { code: 'UNAUTHORIZED', message: 'Session expired' })
}
