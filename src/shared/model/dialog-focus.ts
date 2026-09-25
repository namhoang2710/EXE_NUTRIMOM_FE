export const FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function getFocusableElements(container: Pick<HTMLElement, 'querySelectorAll'>) {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
}

export function focusTargetForTab(focusable: HTMLElement[], active: Element | null, shiftKey: boolean) {
  if (focusable.length === 0) return null
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (shiftKey && active === first) return last
  if (!shiftKey && active === last) return first
  return null
}

export function shouldCloseDialogForKey(key: string, busy: boolean) {
  return key === 'Escape' && !busy
}

export function scrollbarGutter(innerWidth: number, clientWidth: number) {
  return Math.max(0, innerWidth - clientWidth)
}

export function restoreDialogFocus(opener: Pick<HTMLElement, 'focus'> | null) {
  opener?.focus()
}
