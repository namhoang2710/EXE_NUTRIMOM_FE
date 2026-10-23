import { useCallback, useEffect, useRef, useState } from 'react'
import { communityApi } from '../api/community-api'
import { friendlyError } from '../model/community-errors'
import type { CommunityNotification } from '../model/community-types'
import { useCursorCollection } from './useCursorCollection'

const keyOf = (item: CommunityNotification) => item.id
const MIN_REFRESH_GAP_MS = 60_000
/** Personal notifications only load on demand; focus refresh is throttled and never polls. */
export function useCommunityNotifications(panelOpen: boolean) {
  const [unread, setUnread] = useState(0)
  const [writeError, setWriteError] = useState<string | null>(null)
  const lastCountAt = useRef(0)
  const cooldown = useRef(0)
  const writing = useRef(new Set<string>())
  const loader = useCallback((cursor: string | null, signal: AbortSignal) => panelOpen
    ? communityApi.notifications(cursor, 20, signal)
    : Promise.resolve({ items: [], has_more: false }), [panelOpen])
  const list = useCursorCollection(loader, keyOf)
  const { setItems } = list
  const refreshCount = useCallback(async () => {
    if (Date.now() - lastCountAt.current < MIN_REFRESH_GAP_MS || Date.now() < cooldown.current) return
    lastCountAt.current = Date.now()
    try { setUnread((await communityApi.unreadCount()).unread_count) }
    catch (reason) { cooldown.current = friendlyError(reason).retryAt }
  }, [])
  useEffect(() => {
    void refreshCount()
    const onFocus = () => { if (document.visibilityState === 'visible') void refreshCount() }
    document.addEventListener('visibilitychange', onFocus); window.addEventListener('focus', onFocus)
    return () => { document.removeEventListener('visibilitychange', onFocus); window.removeEventListener('focus', onFocus) }
  }, [refreshCount])
  const markRead = useCallback(async (item: CommunityNotification) => {
    if (item.read || writing.current.has(item.id) || writing.current.has('all') || Date.now() < cooldown.current) return
    writing.current.add(item.id)
    try {
      await communityApi.markRead(item.id)
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, read: true } : row))
      setUnread((count) => Math.max(0, count - 1))
    } catch (reason) { const error = friendlyError(reason); cooldown.current = error.retryAt; setWriteError(error.message) }
    finally { writing.current.delete(item.id) }
  }, [setItems])
  const markAllRead = useCallback(async () => {
    if (writing.current.size || Date.now() < cooldown.current) return
    writing.current.add('all')
    try {
      await communityApi.markAllRead()
      setItems((current) => current.map((row) => ({ ...row, read: true })))
      setUnread(0); setWriteError(null)
    } catch (reason) { const error = friendlyError(reason); cooldown.current = error.retryAt; setWriteError(error.message) }
    finally { writing.current.delete('all') }
  }, [setItems])
  return { ...list, unread, error: writeError ?? list.error?.message ?? null, retryAt: list.error?.retryAt ?? cooldown.current, retry: () => { setWriteError(null); list.retry() }, markRead, markAllRead }
}
