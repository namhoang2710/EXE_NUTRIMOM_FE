import type { User } from './auth-types'
import type { OnboardingStatus } from '@/features/user/model/user-types'

export const expertRoles = ['EXPERT', 'DOCTOR'] as const

export function isAdminUser(user: User | null | undefined) {
  return Boolean(user?.roles.includes('ADMIN'))
}

export function isExpertUser(user: User | null | undefined) {
  return Boolean(user?.roles.some((role) => expertRoles.includes(role as (typeof expertRoles)[number])))
}

function isSafeInvitationReturnPath(value: string) {
  if (!value.startsWith('/family/invite?')) return false
  try {
    const parsed = new URL(value, 'https://nutrimom.invalid')
    return parsed.origin === 'https://nutrimom.invalid'
      && parsed.pathname === '/family/invite'
      && !parsed.hash
      && [...parsed.searchParams.keys()].length === 1
      && parsed.searchParams.has('token')
      && Boolean(parsed.searchParams.get('token')?.trim())
  } catch { return false }
}

export function authenticatedDestination(user: User | null | undefined, onboardingStatus?: OnboardingStatus, requestedPath?: unknown) {
  if (isAdminUser(user)) return '/admin'
  if (isExpertUser(user)) return '/expert'
  if (onboardingStatus === 'PROFILE_REQUIRED') return '/onboarding/profile'
  if (typeof requestedPath === 'string' && (/^\/(?:app(?:[/?#]|$)|payment\/(?:success|cancel)(?:[/?#]|$))/.test(requestedPath) || isSafeInvitationReturnPath(requestedPath))) return requestedPath
  return '/app'
}

