import type { User } from '../types/auth'

export function postAuthPath(user: User) {
  return user.onboardingStatus === 'COMPLETED' ? '/app' : '/onboarding/profile'
}
