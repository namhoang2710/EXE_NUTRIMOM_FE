import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiClientError, isAuthenticationError } from '@/core/api/api-error'
import { notificationsApi } from '../api/notifications-api'
import { isRetryableNotificationError, markAllNotificationsRead, markNotificationRead, notificationPageState, resetNotificationState } from '../model/notification-helpers'
import { createNotificationMutationCoordinator, createNotificationRequestCoordinator } from '../model/notification-request-coordinator'
import type { NotificationState } from '../model/notification-types'
import { logDiagnostic } from '@/core/diagnostics/logger'

export function useNotifications(authenticated: boolean, listEnabled: boolean) {
  const [state, setState] = useState<NotificationState>(resetNotificationState)
  const [unreadCount, setUnreadCount] = useState<number>()
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [errorDetail, setErrorDetail] = useState<unknown>()
  const controller = useRef<AbortController | undefined>(undefined)
  const requestCoordinator = useRef(createNotificationRequestCoordinator())
  const mutationCoordinator = useRef(createNotificationMutationCoordinator())
  const alive = useRef(true)
  const unreadSequence = useRef(0)

  useEffect(() => {
    alive.current = true
    const coordinator = requestCoordinator.current
    coordinator.setup()
    return () => {
      alive.current = false
      coordinator.cleanup()
      controller.current?.abort()
      // POST requests are deliberately left in flight and reconciled when they settle.
    }
  }, [])

  const refreshUnreadCount = useCallback(async () => {
    if (!authenticated) return undefined
    const sequence = ++unreadSequence.current
    try {
      const count = await notificationsApi.unreadCount()
      if (alive.current && sequence === unreadSequence.current) setUnreadCount(count)
      return count
    } catch (reason) {
      if (isAuthenticationError(reason)) return undefined
      return undefined
    }
  }, [authenticated])

  const load = useCallback(async (cursor?: string, reset = false) => {
    if (!authenticated || !listEnabled) return
    const requestKey = cursor ? `cursor:${cursor}` : 'first-page'
    if (!requestCoordinator.current.canStart(requestKey) && !controller.current?.signal.aborted) return
    controller.current?.abort()
    const requestController = new AbortController()
    const requestId = requestCoordinator.current.start(requestKey)
    controller.current = requestController
    if (reset) setLoading(true)
    else setLoadingMore(true)
    setError(''); setErrorDetail(undefined)
    try {
      const page = await notificationsApi.list(cursor, false, requestController.signal)
      if (requestController.signal.aborted || !requestCoordinator.current.isCurrent(requestId)) return
      setState((current) => notificationPageState(current, page, reset))
      logDiagnostic({ level: 'info', category: 'notification', event: cursor ? 'pagination_loaded' : 'list_loaded' })
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'REQUEST_ABORTED') return
      if (isAuthenticationError(reason)) return
      if (cursor && reason instanceof ApiClientError && reason.status === 422) {
        setState(resetNotificationState())
        requestCoordinator.current.finish(requestId)
        if (!requestController.signal.aborted && requestCoordinator.current.isActive()) await load(undefined, true)
        return
      }
      if (requestCoordinator.current.isCurrent(requestId) && !requestController.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không thể tải thông báo.'); setErrorDetail(reason); logDiagnostic({ level: 'warn', category: 'notification', event: cursor ? 'pagination_failed' : 'list_failed', error_code: reason instanceof ApiClientError ? reason.code : undefined }) }
    } finally {
      if (requestCoordinator.current.finish(requestId)) { setLoading(false); setLoadingMore(false) }
    }
  }, [authenticated, listEnabled])

  const refresh = useCallback(async () => {
    setState(resetNotificationState())
    await Promise.all([load(undefined, true), refreshUnreadCount()])
  }, [load, refreshUnreadCount])

  const reconcileFirstPage = useCallback(async () => {
    const [page, count] = await Promise.all([
      listEnabled ? notificationsApi.list(undefined, false) : Promise.resolve(undefined),
      notificationsApi.unreadCount(),
    ])
    if (alive.current) {
      if (page) setState((current) => notificationPageState(current, page, true))
      setUnreadCount(count)
    }
    return { page, count }
  }, [listEnabled])

  const read = useCallback(async (id: string) => {
    if (!authenticated) return undefined
    const item = state.items.find((candidate) => candidate.id === id)
    if (!item || item.read_at) return item
    return mutationCoordinator.current.runRead(id, async () => {
      try {
        const updated = await notificationsApi.markRead(id)
        if (alive.current) setState((current) => markNotificationRead(current, id, updated.read_at || new Date().toISOString()))
        await refreshUnreadCount()
        return updated
      } catch (reason) {
        try {
          if (isRetryableNotificationError(reason)) {
            const retried = await notificationsApi.markRead(id)
            if (alive.current) setState((current) => markNotificationRead(current, id, retried.read_at || new Date().toISOString()))
            await refreshUnreadCount()
            logDiagnostic({ level: 'info', category: 'notification', event: 'mark_read_reconciled', retry_attempt: 1 })
            return retried
          }
          const reconciled = await reconcileFirstPage()
          const serverItem = reconciled.page?.items.find((candidate) => candidate.id === id)
          if (serverItem?.read_at) return serverItem
        } catch { /* Keep the original mutation error. */ }
        throw reason
      }
    })
  }, [authenticated, reconcileFirstPage, refreshUnreadCount, state.items])

  const readAll = useCallback(async () => {
    if (!authenticated) return 0
    return mutationCoordinator.current.runReadAll(async () => {
      try {
        const { updated } = await notificationsApi.markAllRead()
        if (alive.current) setState((current) => markAllNotificationsRead(current, new Date().toISOString()))
        await refreshUnreadCount()
        return updated
      } catch (reason) {
        try {
          if (isRetryableNotificationError(reason)) {
            const retried = await notificationsApi.markAllRead()
            if (alive.current) setState((current) => markAllNotificationsRead(current, new Date().toISOString()))
            await refreshUnreadCount()
            logDiagnostic({ level: 'info', category: 'notification', event: 'read_all_reconciled', retry_attempt: 1 })
            return retried.updated
          }
          const reconciled = await reconcileFirstPage()
          if (reconciled.count === 0) return 0
        } catch { /* Keep the original mutation error. */ }
        throw reason
      }
    })
  }, [authenticated, reconcileFirstPage, refreshUnreadCount])

  useEffect(() => {
    if (!authenticated) {
      unreadSequence.current += 1
      requestCoordinator.current.invalidate()
      controller.current?.abort()
      setState(resetNotificationState())
      setUnreadCount(undefined)
      setLoading(false)
      setLoadingMore(false)
      setError('')
      setErrorDetail(undefined)
      return
    }
    void refreshUnreadCount()
    const refreshWhenActive = () => { if (document.visibilityState === 'visible') void refreshUnreadCount() }
    const timer = window.setInterval(refreshWhenActive, 60_000)
    window.addEventListener('focus', refreshWhenActive)
    document.addEventListener('visibilitychange', refreshWhenActive)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshWhenActive)
      document.removeEventListener('visibilitychange', refreshWhenActive)
    }
  }, [authenticated, refreshUnreadCount])

  return { ...state, unreadCount, loading, loadingMore, error, errorDetail, refresh, refreshUnreadCount, read, readAll, loadMore: () => load(state.nextCursor) }
}
