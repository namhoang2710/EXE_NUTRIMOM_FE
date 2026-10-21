import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getSessionScope } from '@/core/auth/token-store'
import { adminRead, adminReads } from '../api/admin-read'
import { canonicalAdminPath } from '../model/admin-read-coordinator'
import { env } from '@/core/config/env'
import { adminRealtime } from '../api/admin-realtime-store'
import { realtimeGroup } from '../model/admin-realtime-sync'

export function useAdminResource<T>(path: string | null, mapper: (payload: unknown) => T, ttl = 30_000, automaticRevalidation = true, realtime?: { defer: () => boolean; dirty: () => void }) {
  const { status: authStatus, user } = useAuth()
  const scope = `${getSessionScope()}:${user?.id}:${user?.roles.join(',')}`
  const [available, setAvailable] = useState(() => !env.adminRealtimeEnabled || document.visibilityState === 'visible' && navigator.onLine)
  const enabled = authStatus === 'authenticated' && user?.roles.includes('ADMIN') && Boolean(path) && available
  const canonical = path ? canonicalAdminPath(path) : ''
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null; errorDetail?:unknown; scope: string; path: string }>({ data: null, loading: true, error: null, scope, path: canonical })
  const [revision, setRevision] = useState(0)
  const [denied, setDenied] = useState(false)
  const request = useRef<{ controller: AbortController; path: string } | null>(null)
  const mapperRef = useRef(mapper)
  const realtimeRef = useRef(realtime); realtimeRef.current = realtime
  mapperRef.current = mapper
  const revalidate = useCallback((invalidate = false, restart = false) => {
    if (!enabled || (request.current && !restart) || adminReads.isDenied() || adminReads.cooldownUntil(`GET:${canonical}`) > Date.now()) return
    if (restart) { request.current?.controller.abort(); request.current = null }
    if (invalidate) adminReads.invalidate(`GET:${canonical}`)
    setRevision((value) => value + 1)
  }, [canonical, enabled])
  const retry = useCallback(() => revalidate(true), [revalidate])
  useEffect(() => {
    if (!env.adminRealtimeEnabled) return
    const active = () => setAvailable(document.visibilityState === 'visible' && navigator.onLine)
    window.addEventListener('online',active); window.addEventListener('offline',active); document.addEventListener('visibilitychange',active)
    return () => { window.removeEventListener('online',active); window.removeEventListener('offline',active); document.removeEventListener('visibilitychange',active) }
  },[])
  useEffect(() => {
    const group = realtimeGroup(canonical), sync = adminRealtime
    if (!enabled || !group || !sync) return
    return sync.register(`GET:${canonical}`,group,() => {
      if (document.visibilityState !== 'visible' || !navigator.onLine || adminReads.isDenied()) return false
      if (realtimeRef.current?.defer()) { realtimeRef.current.dirty(); return true }
      if (request.current || adminReads.hasFlight(`GET:${canonical}`) || adminReads.cooldownUntil(`GET:${canonical}`) > Date.now()) return false
      adminReads.expire(`GET:${canonical}`); revalidate(); return true
    })
  },[canonical,enabled,revalidate])
  useEffect(() => {
    const sync = adminRealtime
    if (!enabled || !sync || realtimeGroup(canonical) !== 'dashboard') return
    let timer: number | undefined, alive = true
    const schedule = () => {
      if (!alive || sync.inspect().state === 'connected' || sync.inspect().state === 'forbidden' || document.visibilityState !== 'visible' || !navigator.onLine) { window.clearTimeout(timer); timer = undefined; return }
      if (timer !== undefined) return
      timer = window.setTimeout(() => {
        timer = undefined
        if (sync.inspect().state !== 'connected' && adminReads.cooldownUntil(`GET:${canonical}`) <= Date.now() && !request.current) { adminReads.expire(`GET:${canonical}`); revalidate() }
        schedule()
      },60_000)
    }
    const unsubscribe = sync.subscribe(schedule); schedule()
    return () => { alive = false; unsubscribe(); window.clearTimeout(timer) }
  },[canonical,enabled,revalidate])
  useEffect(() => {
    if (!enabled) { setState({ data: null, loading: false, error: null, scope, path: canonical }); return }
    const controller = new AbortController()
    request.current = { controller, path: canonical }
    const requestMapper = mapperRef.current
    setState((current) => ({ data: current.scope === scope && current.path === canonical ? current.data : null, loading: true, error: null, scope, path: canonical }))
    // Acquire the lease synchronously so StrictMode setup can retain the same flight.
    adminRead(canonical, requestMapper, controller.signal, ttl).then((data) => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: null, scope, path: canonical })
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setState((current) => ({ ...current, loading: false, errorDetail:reason, error: adminReads.isDenied() ? 'Bạn không đủ quyền truy cập Admin.' : reason instanceof Error ? reason.message : 'Không thể tải dữ liệu. Vui lòng thử lại.' }))
    }).finally(() => { if (request.current?.controller === controller) request.current = null })
    return () => { controller.abort(); if (request.current?.controller === controller) request.current = null }
  }, [canonical, enabled, revision, scope, ttl])
  useEffect(() => {
    const deny = () => { request.current?.controller.abort(); setDenied(true); setState({ data:null,loading:false,error:null,scope,path:canonical }) }
    window.addEventListener('nutrimom:admin-denied', deny)
    return () => window.removeEventListener('nutrimom:admin-denied', deny)
  }, [scope,canonical])
  useEffect(() => {
    if (!enabled || !automaticRevalidation) return
    let lastFocus = 0
    const focus = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine || state.error || request.current || Date.now() - lastFocus < 5_000 || !adminReads.isStale(`GET:${canonical}`)) return
      lastFocus = Date.now(); setRevision((value) => value + 1)
    }
    const invalidate = (event: Event) => {
      const paths = (event as CustomEvent<string[]>).detail
      if (paths?.some((prefix) => canonical.startsWith(prefix))) setRevision((value) => value + 1)
    }
    window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus); window.addEventListener('online', focus)
    window.addEventListener('nutrimom:admin-invalidated', invalidate)
    return () => { window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); window.removeEventListener('online', focus); window.removeEventListener('nutrimom:admin-invalidated', invalidate) }
  }, [canonical, enabled, state.error, automaticRevalidation])
  const matches = state.scope === scope && state.path === canonical
  const data = matches && enabled && !denied ? state.data : null
  const loading = Boolean(enabled && (!matches || state.loading))
  return { data, loading:loading && !denied, error: matches && enabled ? state.error : null, errorDetail:matches&&enabled?state.errorDetail:undefined, retry, revalidate, status: (loading && !data ? 'loading' : state.error && matches ? 'error' : 'success') as 'loading' | 'error' | 'success' }
}
