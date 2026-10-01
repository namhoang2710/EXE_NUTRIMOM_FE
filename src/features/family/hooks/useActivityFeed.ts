import { useCallback, useEffect, useRef, useState } from 'react'
import { familyApi } from '../api/family-api'
import { familyErrorMessage, isFamilyError } from '../model/family-errors'
import type { ActivityEvent } from '../model/family-types'
import { activityFeedNextState } from '../model/family-requests'

const activityRequests = new Map<string, Promise<Awaited<ReturnType<typeof familyApi.activity>>>>()

function requestActivityPage(cursor?: string) {
  const key = cursor || '__first__'
  const existing = activityRequests.get(key)
  if (existing) return existing
  const request = familyApi.activity(cursor)
  activityRequests.set(key, request)
  void request.finally(() => { window.setTimeout(() => activityRequests.delete(key), 0) }).catch(() => undefined)
  return request
}
export function useActivityFeed(enabled: boolean) {
  const [items, setItems] = useState<ActivityEvent[]>([])
  const [nextCursor, setNextCursor] = useState<string>()
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(enabled)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)
  const busy = useRef(false)

  const load = useCallback(async (cursor?: string, reset = false) => {
    if (!enabled || busy.current) return
    busy.current = true
    const currentRequest = ++requestId.current
    if (reset) setLoading(true)
    else setLoadingMore(true)
    setError('')
    try {
      const page = await requestActivityPage(cursor)
      if (requestId.current !== currentRequest) return
      setItems((current) => activityFeedNextState({ items: current, hasMore: false }, page, reset).items)
      setNextCursor(page.next_cursor)
      setHasMore(page.has_more)
    } catch (reason) {
      if (requestId.current !== currentRequest) return
      if (cursor && isFamilyError(reason, 'VALIDATION_ERROR')) {
        busy.current = false
        await load(undefined, true)
        return
      }
      setError(familyErrorMessage(reason))
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false)
        setLoadingMore(false)
      }
      busy.current = false
    }
  }, [enabled])

  const refresh = useCallback(() => {
    setNextCursor(undefined)
    setHasMore(false)
    return load(undefined, true)
  }, [load])

  useEffect(() => {
    if (enabled) void refresh()
    else { setItems([]); setLoading(false); setError('') }
    return () => { requestId.current += 1; busy.current = false }
  }, [enabled, refresh])

  return {
    items,
    hasMore,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore: () => load(nextCursor),
  }
}

