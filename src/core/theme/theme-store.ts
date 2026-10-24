export type Theme = 'light' | 'dark'
const storageKey = 'nutrimom.theme'
const themeEvent = 'nutrimom:theme-changed'
let fallbackTheme: Theme = 'light'

export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Appearance still works when browser storage is unavailable. */ }
  return fallbackTheme
}

export function setTheme(theme: Theme) {
  fallbackTheme = theme
  try { localStorage.setItem(storageKey, theme) } catch { /* Use this tab's preference. */ }
  window.dispatchEvent(new Event(themeEvent))
}

export function subscribeTheme(listener: () => void) {
  function stored(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) listener()
  }
  window.addEventListener(themeEvent, listener)
  window.addEventListener('storage', stored)
  return () => {
    window.removeEventListener(themeEvent, listener)
    window.removeEventListener('storage', stored)
  }
}

/** Run before React mounts so direct links and session recovery use the saved appearance. */
export function initializeTheme() {
  const apply = () => { document.documentElement.dataset.theme = getTheme() }
  apply()
  return subscribeTheme(apply)
}
