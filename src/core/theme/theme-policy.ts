import type { Theme } from './theme-store.ts'

/** Marketing never overwrites the saved appearance of the authenticated workspace. */
export function effectiveTheme(pathname: string, preferred: Theme): Theme {
  return /^\/(?:login|register|otp|forgot-password|reset-password|auth|app|admin|expert|onboarding|payment|family)(?:\/|$)/i.test(pathname)
    ? preferred : 'light'
}
