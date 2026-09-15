import { useSyncExternalStore } from 'react'

const storageKey = 'nutrimom:knowledge:bookmarks:v1'
const listeners = new Set<() => void>()

function readBookmarks(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : []
  } catch {
    return []
  }
}

let savedSlugs = readBookmarks()
const serverSnapshot: string[] = []
const notify = () => listeners.forEach((listener) => listener())

function onStorage(event: StorageEvent) {
  if (event.key === storageKey || event.key === null) {
    savedSlugs = readBookmarks()
    notify()
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}

// Device-local UI preview. Replace with authenticated CMS bookmarks when integrated.
export function useArticleBookmarks() {
  const slugs = useSyncExternalStore(subscribe, () => savedSlugs, () => serverSnapshot)
  function toggleBookmark(slug: string) {
    const removing = savedSlugs.includes(slug)
    savedSlugs = removing ? savedSlugs.filter((item) => item !== slug) : [...savedSlugs, slug]
    let persisted = true
    try { localStorage.setItem(storageKey, JSON.stringify(savedSlugs)) } catch { persisted = false }
    notify()
    return removing ? 'Đã bỏ lưu bài viết.' : persisted ? 'Đã lưu bài viết trên thiết bị này.' : 'Đã lưu trong phiên này. Trình duyệt hiện không cho phép lưu lâu dài.'
  }
  return { savedSlugs: slugs, toggleBookmark }
}
