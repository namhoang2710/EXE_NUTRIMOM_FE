import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRetryCountdown } from '@/features/payment/hooks/usePaymentCooldown'
import { REVIEW_CHANGED, reviewCooldown, reviewFamily, reviewsApi } from '../api/reviews-api'
import { mergeReviewPage, type AdminReview, type PublicReview, type ReviewFilters, type ReviewPage } from '../model/review-types'
import { getSessionScope } from '@/core/auth/token-store'
import { ApiClientError } from '@/core/api/api-error'

export function useReviewCooldown(kind: 'public' | 'own' | 'admin') {
  const family = reviewFamily(kind)
  const until = useSyncExternalStore(reviewCooldown.subscribe, useCallback(() => reviewCooldown.until(family), [family]), () => 0)
  return useRetryCountdown(until)
}
export function useReviewData<T>(key: string, load: (force: boolean, signal: AbortSignal) => Promise<T>, enabled = true, interval = 0, kind: 'public' | 'own' | 'admin' = 'public') {
  const [data, setData] = useState<T>()
  const [dataKey, setDataKey] = useState(key)
  const [error, setError] = useState<unknown>()
  const failure = useRef<unknown>(undefined)
  const [errorKey, setErrorKey] = useState(key)
  const [loading, setLoading] = useState(false)
  const loader = useRef(load); loader.current = load
  const active = useRef<AbortController | null>(null)
  const refresh = useCallback(async (force = true) => {
    if (!enabled || active.current) return
    const controller = new AbortController(); active.current = controller
    setLoading(true)
    try {
      const next = await loader.current(force, controller.signal)
      if (!controller.signal.aborted) { setData(next); setDataKey(key); setError(undefined); failure.current = undefined }
      return controller.signal.aborted ? undefined : next
    } catch (reason) { if (!controller.signal.aborted) { setError(reason); setErrorKey(key); failure.current = reason } }
    finally { if (active.current === controller) { active.current = null; setLoading(false) } }
  }, [enabled, key])
  useEffect(() => {
    void refresh(false)
    // A 429 on one endpoint pauses automatic reads across its entire policy family.
    // An explicit successful read after Retry-After clears that family pause.
    const rateLimited = () => (failure.current instanceof ApiClientError && failure.current.status === 429) || reviewCooldown.until(reviewFamily(kind)) > 0
    const changed = () => { active.current?.abort(); active.current = null; if (!rateLimited()) void refresh() }
    const foreground = () => { if (!rateLimited() && document.visibilityState === 'visible' && navigator.onLine) void refresh(false) }
    window.addEventListener(REVIEW_CHANGED, changed)
    window.addEventListener('online', foreground); document.addEventListener('visibilitychange', foreground)
    const timer = enabled && interval ? window.setInterval(() => { if (!rateLimited() && document.visibilityState === 'visible' && navigator.onLine) void refresh() }, interval) : undefined
    return () => { active.current?.abort(); active.current = null; clearInterval(timer); window.removeEventListener(REVIEW_CHANGED, changed); window.removeEventListener('online', foreground); document.removeEventListener('visibilitychange', foreground) }
  }, [enabled, interval, key, kind, refresh])
  return { data: dataKey === key ? data : undefined, error: errorKey === key ? error : undefined, loading, refresh, setData: (next: T) => { setData(next); setDataKey(key) } }
}

export function useReviewFeed(kind: 'public' | 'admin', filters: ReviewFilters, enabled = true, limit = 10, interval = 0) {
  const key = `${kind}:${kind === 'admin' ? getSessionScope() : ''}:${JSON.stringify(filters)}:${limit}`
  const [items, setItems] = useState<Array<PublicReview | AdminReview>>([])
  const [itemsKey, setItemsKey] = useState(key)
  const firstSignature = useRef('')
  const [cursor, setCursor] = useState<string>()
  const [hasMore, setHasMore] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const [moreError, setMoreError] = useState<unknown>()
  const [loadingMore, setLoadingMore] = useState(false)
  const moreBusy = useRef(false), moreController = useRef<AbortController | null>(null), generation = useRef(0), expanded = useRef(false)
  const load = (nextCursor?: string, force = false, signal?: AbortSignal): Promise<ReviewPage<PublicReview | AdminReview>> => kind === 'admin'
    ? reviewsApi.adminList(filters, nextCursor, force, signal) : reviewsApi.list(filters, nextCursor, limit, force, signal)
  const first = useReviewData(key, (force, signal) => load(undefined, force, signal), enabled, interval, kind)
  useEffect(() => { generation.current++; moreController.current?.abort(); moreBusy.current = false; expanded.current = false; setItems([]); setCursor(undefined); setHasMore(false); setHasNew(false); setMoreError(undefined); setLoadingMore(false) }, [key])
  useEffect(() => {
    if (!first.data) return
    const signature = JSON.stringify(first.data.items)
    if (expanded.current) { setHasNew(signature !== firstSignature.current); return }
    firstSignature.current = signature
    setItems(first.data.items); setItemsKey(key); setCursor(first.data.next_cursor); setHasMore(first.data.has_more); setHasNew(false)
  }, [first.data, key])
  useEffect(() => () => { moreController.current?.abort() }, [])
  async function more() {
    if (!hasMore || !cursor || moreBusy.current) return
    const epoch = generation.current
    const controller = new AbortController(); moreController.current = controller; moreBusy.current = true; setLoadingMore(true); setMoreError(undefined)
    try {
      const next = await load(cursor, false, controller.signal)
      if (!controller.signal.aborted && epoch === generation.current) { expanded.current = true; setItems(old => mergeReviewPage(old, next.items)); setCursor(next.next_cursor); setHasMore(next.has_more) }
    } catch (reason) { if (!controller.signal.aborted) setMoreError(reason) }
    finally { if (epoch === generation.current) { moreBusy.current = false; setLoadingMore(false) } }
  }
  async function reload() { expanded.current = false; setMoreError(undefined); await first.refresh() }
  return { items: itemsKey === key ? items : [], hasMore: itemsKey === key && hasMore, hasNew, loading: first.loading, error: moreError || first.error, loadingMore, more, reload }
}
