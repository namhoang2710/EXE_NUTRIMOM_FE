import type { User } from './auth-types'
import type { OnboardingStatus } from '@/features/user/model/user-types'

export const expertRoles = ['EXPERT', 'DOCTOR'] as const

export function isAdminUser(user: User | null | undefined) {
  return Boolean(user?.roles.includes('ADMIN'))
}

export function isExpertUser(user: User | null | undefined) {
  return Boolean(user?.roles.some((role) => expertRoles.includes(role as (typeof expertRoles)[number])))
}

export function authenticatedDestination(user: User | null | undefined, onboardingStatus?: OnboardingStatus) {
  if (isAdminUser(user)) return '/admin'
  if (isExpertUser(user)) return '/expert'
  if (onboardingStatus === 'PROFILE_REQUIRED') return '/onboarding/profile'
  return '/app'
}

