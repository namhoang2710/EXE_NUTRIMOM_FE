import { useCallback, useEffect, useRef, useState } from 'react'
import { getSessionScope } from '@/core/auth/token-store'
import { adminReads } from '@/features/admin/api/admin-read'
import { adminRealtime } from '@/features/admin/api/admin-realtime-store'
import { communityAdminApi } from '../api/community-admin-api'
import { communityEndpoints } from '../model/community-endpoints'
import { friendlyError, isAbort, type FriendlyError } from '../model/community-errors'

/** Pending means outstanding work, never unread notifications. Server state is authoritative. */
export function useAdminCommunityPending() {
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState<FriendlyError | null>(null)
  const [revision, setRevision] = useState(0)
  const currentCount = useRef<number | null>(null)
  const retryRef = useRef<() => void>(() => {})
  const retry = useCallback(() => retryRef.current(), [])
  useEffect(() => {
    let alive = true, timer: number | undefined, queued: number | undefined, controller: AbortController | undefined
    let epoch = 0, retryAt = 0, failures = 0, dirty = false
    let lastSnapshot: unknown
    const scope = getSessionScope(), sync = adminRealtime, path = communityEndpoints.admin.pendingCount
    const valid = () => alive && scope === getSessionScope() && !adminReads.isDenied()
    const active = () => valid() && document.visibilityState === 'visible' && navigator.onLine
    const accept = (next: number) => {
      if (!valid()) return
      if (currentCount.current !== null && currentCount.current !== next) setRevision((value) => value + 1)
      currentCount.current = next; setCount(next); setError(null); failures = 0
    }
    const live = () => sync?.inspect().state === 'connected' && sync.inspect().snapshot?.community_pending_count !== undefined
    function schedule() {
      window.clearTimeout(timer)
      if (!active() || live()) return
      timer = window.setTimeout(() => void load(true), Math.max(30_000, retryAt - Date.now()))
    }
    async function load(fresh: boolean) {
      if (!fresh && live()) return
      if (!active() || controller) { schedule(); return }
      const blocked = Math.max(retryAt, adminReads.cooldownUntil(`GET:${path}`))
      if (Date.now() < blocked) { retryAt = blocked; schedule(); return }
      if (fresh) adminReads.expire(`GET:${path}`)
      const request = new AbortController(), started = epoch
      controller = request; dirty = false
      try {
        const next = await communityAdminApi.pendingCount(request.signal)
        if (valid() && !request.signal.aborted && started === epoch) accept(next)
      } catch (reason) {
        if (valid() && !request.signal.aborted && !isAbort(reason)) {
          const failure = friendlyError(reason); retryAt = failure.retryAt || Date.now() + Math.min(120_000, 30_000 * 2 ** Math.min(failures++, 2)); setError({ ...failure, retryAt })
        }
      } finally { if (controller === request) controller = undefined; if (dirty && active() && Date.now() >= retryAt) invalidate(); else schedule() }
    }
    function invalidate() {
      dirty = true
      if (!active() || queued !== undefined) return
      queued = window.setTimeout(() => { queued = undefined; void load(true) }, 80)
    }
    const invalidated = (event: Event) => {
      if ((event as CustomEvent<string[]>).detail?.some((prefix) => path.startsWith(prefix))) invalidate()
    }
    const snapshot = () => {
      if (!valid()) return
      const next = sync?.inspect().snapshot
      if (next && next !== lastSnapshot && next.community_pending_count !== undefined) {
        lastSnapshot = next; epoch++; controller?.abort(); controller = undefined
        retryAt = 0; accept(next.community_pending_count)
      }
      schedule()
    }
    const visibility = () => { if (active()) { snapshot(); if (!live()) invalidate() } else window.clearTimeout(timer) }
    const stop = () => { epoch++; controller?.abort(); controller = undefined; window.clearTimeout(timer); window.clearTimeout(queued); currentCount.current = null; setCount(null) }
    const unsubscribe = sync?.subscribe(snapshot)
    retryRef.current = invalidate
    snapshot()
    if (!live()) queued = window.setTimeout(() => { queued = undefined; void load(false) }, 0)
    window.addEventListener('nutrimom:admin-invalidated', invalidated)
    window.addEventListener('focus', visibility); window.addEventListener('online', visibility); window.addEventListener('offline', visibility); document.addEventListener('visibilitychange', visibility)
    for (const name of ['nutrimom:session-cleared', 'nutrimom:session-changed', 'nutrimom:admin-denied']) window.addEventListener(name, stop)
    return () => {
      alive = false; controller?.abort(); window.clearTimeout(timer); window.clearTimeout(queued); unsubscribe?.(); retryRef.current = () => {}
      window.removeEventListener('nutrimom:admin-invalidated', invalidated)
      window.removeEventListener('focus', visibility); window.removeEventListener('online', visibility); window.removeEventListener('offline', visibility); document.removeEventListener('visibilitychange', visibility)
      for (const name of ['nutrimom:session-cleared', 'nutrimom:session-changed', 'nutrimom:admin-denied']) window.removeEventListener(name, stop)
    }
  }, [])
  return { count, error, revision, retry }
}
