import { useCallback, useEffect, useRef, useState } from 'react'
import { communityApi } from '../api/community-api'
import { friendlyError, isAbort } from '../model/community-errors'
import type { CommunityNotification } from '../model/community-types'

const MIN_REFRESH_GAP_MS = 60_000
const PAGE_SIZE = 20

/**
 * Thông báo riêng của Cộng đồng (tách khỏi chuông header).
 * Số chưa đọc chỉ tải khi mở trang và khi tab được focus lại (cách nhau ≥ 60 giây) — không polling.
 * Danh sách chỉ tải khi mở panel.
 */
export function useCommunityNotifications(panelOpen: boolean) {
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<CommunityNotification[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastCountAt = useRef(0)
  const inFlight = useRef(false)

  const refreshCount = useCallback(async (force = false) => {
    if (!force && Date.now() - lastCountAt.current < MIN_REFRESH_GAP_MS) return
    lastCountAt.current = Date.now()
    try {
      setUnread((await communityApi.unreadCount()).unread_count)
    } catch { /* Số chưa đọc không quan trọng bằng nội dung trang; lần focus sau sẽ thử lại. */ }
  }, [])

  useEffect(() => {
    void refreshCount(true)
    const onFocus = () => { if (document.visibilityState === 'visible') void refreshCount() }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [refreshCount])

  const load = useCallback(async (from: string | null, signal?: AbortSignal) => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    setError(null)
    try {
      const page = await communityApi.notifications(from, PAGE_SIZE, signal)
      setItems((current) => (from ? [...current, ...page.items] : page.items))
      setCursor(page.next_cursor ?? null)
      setHasMore(page.has_more)
    } catch (reason) {
      if (!isAbort(reason)) setError(friendlyError(reason).message)
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!panelOpen) return
    const controller = new AbortController()
    void load(null, controller.signal)
    return () => controller.abort()
  }, [panelOpen, load])

  const markRead = useCallback(async (notification: CommunityNotification) => {
    if (notification.read) return
    setItems((current) => current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)))
    setUnread((count) => Math.max(0, count - 1))
    try { await communityApi.markRead(notification.id) } catch { /* Không chặn điều hướng; lần mở sau sẽ đồng bộ lại. */ }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await communityApi.markAllRead()
      setItems((current) => current.map((item) => ({ ...item, read: true })))
      setUnread(0)
    } catch (reason) {
      setError(friendlyError(reason).message)
    }
  }, [])

  return { unread, items, hasMore, loading, error, loadMore: () => { if (cursor) void load(cursor) }, retry: () => void load(null), markRead, markAllRead }
}
