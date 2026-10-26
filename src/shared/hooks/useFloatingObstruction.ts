import { useSyncExternalStore } from 'react'

let blocked = false
let stop: (() => void) | undefined
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!stop && typeof document !== 'undefined') {
    let frame = 0
    const update = () => {
      frame = 0
      const visible = (element: Element) => {
        const box = element.getBoundingClientRect()
        return box.width > 0 && box.height > 0 && box.top < window.innerHeight && box.bottom > 0
      }
      const next = [...document.querySelectorAll('[data-ui-overlay], [aria-modal="true"], .nm-call-page, .consultation-booking-bar, .nm-review-form footer, .nm-form-actions')].some(visible)
        || Boolean(document.activeElement?.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]'))
      if (next !== blocked) { blocked = next; for (const notify of listeners) notify() }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal', 'data-ui-overlay', 'hidden'] })
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    document.addEventListener('focusin', schedule)
    document.addEventListener('focusout', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    update()
    stop = () => {
      observer.disconnect(); cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule)
      document.removeEventListener('focusin', schedule); document.removeEventListener('focusout', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
    }
  }
  return () => { listeners.delete(listener); if (!listeners.size) { stop?.(); stop = undefined; blocked = false } }
}

export function useFloatingObstruction() {
  return useSyncExternalStore(subscribe, () => blocked, () => false)
}
