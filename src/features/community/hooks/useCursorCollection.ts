import { useCallback, useEffect, useRef, useState } from 'react'
import { friendlyError, isAbort, type FriendlyError } from '../model/community-errors'
import type { CursorPage } from '../model/community-types'

/** One active cursor request, debounced filters, stale response protection; never retries a 429. */
export function useCursorCollection<T>(loader: (cursor: string | null, signal: AbortSignal) => Promise<CursorPage<T>>, keyOf: (item: T) => string) {
  const [items, setItems] = useState<T[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<FriendlyError | null>(null)
  const active = useRef<AbortController | null>(null)
  const generation = useRef(0)
  const deadline = useRef(0)
  const failedCursor = useRef<string | null>(null)
  const load = useCallback(async (from: string | null) => {
    if (active.current || Date.now() < deadline.current) return
    const controller = new AbortController()
    const current = generation.current
    active.current = controller
    setLoading(true); setError(null)
    failedCursor.current = from
    try {
      const page = await loader(from, controller.signal)
      if (controller.signal.aborted || current !== generation.current) return
      setItems((previous) => {
        const base = from ? previous : []
        const seen = new Set(base.map(keyOf))
        return [...base, ...page.items.filter((item) => { const id = keyOf(item); if (seen.has(id)) return false; seen.add(id); return true })].slice(-200)
      })
      setCursor(page.next_cursor ?? null)
      setHasMore(page.has_more && Boolean(page.next_cursor) && page.next_cursor !== from)
      deadline.current = 0
    } catch (reason) {
      if (!controller.signal.aborted && current === generation.current && !isAbort(reason)) {
        const failure = friendlyError(reason)
        deadline.current = failure.retryAt
        setError(failure)
      }
    } finally {
      if (active.current === controller) { active.current = null; setLoading(false) }
    }
  }, [loader, keyOf])
  useEffect(() => {
    generation.current++
    failedCursor.current = null
    active.current?.abort(); active.current = null
    setItems([]); setCursor(null); setHasMore(false)
    if (Date.now() < deadline.current) { setLoading(false); return }
    setLoading(true); setError(null)
    const timer = window.setTimeout(() => void load(null), 180)
    return () => { window.clearTimeout(timer); active.current?.abort(); active.current = null }
  }, [load])
  return {
    items, setItems, hasMore, windowed: items.length >= 200, loading, error,
    loadMore: () => { if (hasMore && cursor) void load(cursor) },
    retry: () => void load(failedCursor.current),
    reload: () => { if (!active.current) void load(null) },
  }
}
