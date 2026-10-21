/** Volatile, one-use credential-login token. Never saved in URL/history/storage. */
// Dashboard: KPI frames 3220–3740, numbers to 4740, section frames to 5060, primary charts to 6140ms.
export const adminLoginAnimationDurationMs = 6_500

export function createAdminLoginAnimation(now: () => number = Date.now) {
  let pending: { scope: string; expires: number } | null = null
  return {
    arm(scope: string) { pending = { scope, expires: now() + 10_000 } },
    consume(scope: string) { const token = pending; pending = null; return Boolean(token && token.scope === scope && token.expires > now()) },
    clear() { pending = null },
  }
}
export const adminLoginAnimation = createAdminLoginAnimation()
if (typeof window !== 'undefined') window.addEventListener('nutrimom:session-cleared', () => adminLoginAnimation.clear())
