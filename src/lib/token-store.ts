import type { ApiAuthResponse, AuthSession } from '../types/auth'
import { normalizeUser } from '../types/auth'

const SESSION_KEY = 'nutrimom.auth-session'

let memorySession: AuthSession | null = null

export function getSession() {
  if (memorySession) return memorySession

  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    memorySession = JSON.parse(raw) as AuthSession
    return memorySession
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function saveApiSession(response: ApiAuthResponse) {
  const now = Date.now()
  const session: AuthSession = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    accessExpiresAt: now + response.expires_in * 1000,
    refreshExpiresAt: now + response.refresh_expires_in * 1000,
    tokenType: response.token_type,
    user: normalizeUser(response.user),
  }

  memorySession = session
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function clearSession() {
  memorySession = null
  sessionStorage.removeItem(SESSION_KEY)
}
