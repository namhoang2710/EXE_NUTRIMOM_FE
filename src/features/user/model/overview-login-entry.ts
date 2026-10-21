/** Volatile token: a restored session and browser history cannot replay the welcome. */
export function createOverviewLoginEntry(now = Date.now) {
  let pending: { scope: string; until: number; panelsOpened: boolean } | null = null
  return {
    arm(scope: string) {
      pending = { scope, until: now() + 30_000, panelsOpened: false }
    },
    markPanelsOpened(scope: string) {
      if (pending?.scope === scope && pending.until > now()) pending.panelsOpened = true
    },
    panelsAlreadyOpened(scope: string) {
      return Boolean(pending?.scope === scope && pending.until > now() && pending.panelsOpened)
    },
    consume(scope: string) {
      const value = pending
      pending = null
      return Boolean(value && value.scope === scope && value.until > now())
    },
    clear() {
      pending = null
    },
  }
}
export const overviewLoginEntry = createOverviewLoginEntry()
if (typeof window !== 'undefined') {
  window.addEventListener('nutrimom:session-cleared', () =>
    overviewLoginEntry.clear(),
  )
  window.addEventListener('nutrimom:session-changed', () =>
    overviewLoginEntry.clear(),
  )
}
