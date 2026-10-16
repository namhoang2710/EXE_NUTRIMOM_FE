import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { getSessionScope } from '@/core/auth/token-store'
import { notificationPageState, resetNotificationState } from '@/features/notifications/model/notification-helpers'
import type { NotificationPage, NotificationState } from '@/features/notifications/model/notification-types'
import { NotificationContractError } from '@/features/notifications/model/notification-normalizers'
import { adminRead, adminReads, adminNotificationMutation } from '../api/admin-read'
import { adminRealtime } from '../api/admin-realtime-store'
import { newerRevision } from '../model/admin-realtime-contract'
import { useAdminResource } from './useAdminResource'
import { adminNotificationCountPath, applyAdminRead, applyAdminReadAll, buildAdminNotificationsPath, buildAdminReadAllPath, createAdminCursorRecovery, createAdminNotificationMutations, normalizeAdminNotification, normalizeAdminNotificationPage, normalizeAdminNotificationCount, normalizeNotificationTotal, type AdminNotificationFilter } from '../model/admin-notifications'

type CachedFeed = { state: NotificationState; filter: AdminNotificationFilter; first: NotificationPage }
const allFilter: AdminNotificationFilter = { unreadOnly:false }
const interactive = () => document.visibilityState === 'visible' && navigator.onLine

/** The shell owns both scopes, their writes and the only notification polling clock. */
export function useAdminNotificationOwner(bellOpen: boolean, pageFilter: AdminNotificationFilter | null) {
  const scope = getSessionScope()
  const [available,setAvailable] = useState(interactive)
  const [denied,setDenied] = useState(false)
  const [feeds,setFeeds] = useState<Map<string,CachedFeed>>(() => new Map())
  const feedsRef = useRef(feeds); feedsRef.current = feeds
  const extended = useRef(new Set<string>())
  const writesRef = useRef(0)
  const [hasNew,setHasNew] = useState<Record<string,boolean>>({})
  const bellKey = buildAdminNotificationsPath(allFilter)
  const pageKey = pageFilter ? buildAdminNotificationsPath(pageFilter) : ''
  const realtimeOptions = (key:string) => ({ defer: () => extended.current.has(key) || writesRef.current > 0, dirty: () => { if (extended.current.has(key)) setHasNew(old => ({...old,[key]:true})) } })
  const bell = useAdminResource(bellOpen && available && !denied ? bellKey : null,(p) => normalizeAdminNotificationPage(p,allFilter),30_000,false,realtimeOptions(bellKey))
  const page = useAdminResource(pageFilter && available && !denied ? pageKey : null,(p) => normalizeAdminNotificationPage(p,pageFilter!),30_000,false,realtimeOptions(pageKey))
  const [unreadCount,setUnreadCount] = useState<number>()
  const [stale,setStale] = useState(false)
  const [more,setMore] = useState<Record<string,boolean>>({})
  const [errors,setErrors] = useState<Record<string,string>>({})
  const [pendingWrites,setPendingWrites] = useState(0)
  const alive = useRef(false)
  const stopped = useRef(false)
  const countController = useRef<AbortController | null>(null)
  const moreControllers = useRef(new Map<string,AbortController>())
  const mutations = useRef(createAdminNotificationMutations())
  const cursorRecovery = useRef(createAdminCursorRecovery())
  const failures = useRef(0)
  const nextPoll = useRef(0)
  const previousCount = useRef<number | undefined>(undefined)
  const pendingCount = useRef<Promise<number | undefined> | null>(null)
  const suppressCountReconcile = useRef(false)
  const countVersion = useRef(0)
  const countRevision = useRef<string | undefined>(undefined)
  const current = useCallback(() => alive.current && !stopped.current && scope === getSessionScope() && !adminReads.isDenied(),[scope])
  const visible = useRef<Array<{ key:string; resource:typeof bell }>>([])
  visible.current = [...(bellOpen ? [{key:bellKey,resource:bell}] : []),...(pageFilter ? [{key:pageKey,resource:page}] : [])]
  const commit = useCallback((update:(value:Map<string,CachedFeed>) => Map<string,CachedFeed>) => {
    const next = update(feedsRef.current); feedsRef.current = next; setFeeds(next)
  },[])
  useEffect(() => {
    if (!bell.data || denied || adminRealtime && extended.current.has(bellKey)) return
    commit((old) => { if (old.get(bellKey)?.first === bell.data) return old; const next=new Map(old); next.set(bellKey,{ state:notificationPageState(resetNotificationState(),bell.data!,true),filter:allFilter,first:bell.data! });return next })
  },[bell.data,bellKey,commit,denied])
  useEffect(() => {
    if (!page.data || !pageFilter || denied || adminRealtime && extended.current.has(pageKey)) return
    commit((old) => { if (old.get(pageKey)?.first === page.data) return old; const next=new Map(old); next.set(pageKey,{ state:notificationPageState(resetNotificationState(),page.data!,true),filter:pageFilter,first:page.data! });return next })
  },[page.data,pageKey,pageFilter,commit,denied])

  const reconcile = useCallback((force = false) => {
    if (!interactive() || stopped.current || scope !== getSessionScope()) return
    const keys = new Set(visible.current.map(({key}) => key))
    for (const key of keys) {
      if (adminRealtime && extended.current.has(key)) { setHasNew(old => ({...old,[key]:true})); continue }
      if (adminRealtime && writesRef.current) continue
      const reason = visible.current.find((entry) => entry.key === key)?.resource.errorDetail
      if (reason instanceof NotificationContractError || (reason instanceof ApiClientError && [400,401,403,404,422].includes(reason.status))) continue
      if (adminReads.cooldownUntil(`GET:${key}`) > Date.now() || adminReads.hasFlight(`GET:${key}`)) continue
      if (!force && !adminReads.isStale(`GET:${key}`)) continue
      adminReads.invalidate(`GET:${key}`)
      for (const entry of visible.current) if (entry.key === key) entry.resource.revalidate(false,true)
    }
  },[scope])
  const refreshUnreadCount = useCallback((): Promise<number | undefined> => {
    if (adminRealtime?.inspect().state === 'connected') return Promise.resolve(undefined)
    if (pendingCount.current) return pendingCount.current
    if (!alive.current || stopped.current || !interactive() || scope !== getSessionScope() || Date.now() < nextPoll.current) return Promise.resolve(undefined)
    const controller = new AbortController(); countController.current = controller
    const started = countVersion.current
    const pending = adminRead(adminNotificationCountPath,normalizeAdminNotificationCount,controller.signal,60_000).then((payload) => {
      const value = payload.count
      if (started !== countVersion.current || payload.realtime_revision !== undefined && countRevision.current !== undefined && newerRevision(countRevision.current,payload.realtime_revision)) return undefined
      if (!controller.signal.aborted && alive.current && scope === getSessionScope() && !stopped.current) {
        if (payload.realtime_revision !== undefined) countRevision.current = payload.realtime_revision
        const changed = previousCount.current !== undefined && previousCount.current !== value
        previousCount.current = value; setUnreadCount(value); setStale(false); failures.current = 0; nextPoll.current = Date.now() + 60_000
        // Reuse the count clock to reconcile visible stale feeds, even when count is unchanged.
        if (!suppressCountReconcile.current) reconcile(changed)
        suppressCountReconcile.current = false
      }
      return value
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted && alive.current && scope === getSessionScope() && !stopped.current) {
        setStale(true)
        if (reason instanceof ApiClientError && [400,401,403,404,422].includes(reason.status)) stopped.current = true
        const delay = Math.min(300_000,60_000 * 2 ** Math.min(failures.current++,3))
        nextPoll.current = Math.max(Date.now()+delay,adminReads.cooldownUntil(`GET:${adminNotificationCountPath}`))
      }
      return undefined
    }).finally(() => { if (pendingCount.current === pending) pendingCount.current = null })
    pendingCount.current = pending
    return pending
  },[scope,reconcile])
  useEffect(() => {
    alive.current = true
    let subscribed = true
    const pagination = moreControllers.current
    let timer:number | undefined
    const schedule = () => {
      window.clearTimeout(timer)
      if (!subscribed || !interactive() || stopped.current || adminRealtime?.inspect().state === 'connected') return
      const due = Math.max(nextPoll.current,adminReads.cooldownUntil(`GET:${adminNotificationCountPath}`))
      timer = window.setTimeout(() => { void refreshUnreadCount().finally(schedule) },Math.min(2_147_483_647,Math.max(0,due-Date.now())))
    }
    void refreshUnreadCount().finally(schedule)
    const active = () => {
      setAvailable(interactive())
      if (!interactive()) { window.clearTimeout(timer); countController.current?.abort(); pendingCount.current=null; return }
      if (adminRealtime?.inspect().state !== 'connected') reconcile(); void refreshUnreadCount().finally(schedule)
    }
    const deny = () => {
      stopped.current = true; window.clearTimeout(timer); countController.current?.abort()
      for (const controller of moreControllers.current.values()) controller.abort()
      moreControllers.current.clear(); setDenied(true); commit(() => new Map()); setUnreadCount(undefined); setStale(false); setMore({}); setErrors({})
    }
    const unsubscribe = adminReads.subscribe(() => { if (adminReads.isDenied()) deny(); else schedule() })
    const sync = adminRealtime
    let lastSnapshot: unknown
    const unsubscribeRealtime = sync?.subscribe(() => {
      if (!current()) return
      const { snapshot } = sync.inspect()
      if (snapshot && snapshot !== lastSnapshot) {
        if (countRevision.current !== undefined && newerRevision(countRevision.current,snapshot.notifications_revision)) { schedule(); return }
        lastSnapshot = snapshot; countVersion.current++
        countController.current?.abort(); pendingCount.current = null
        countRevision.current = snapshot.notifications_revision
        previousCount.current = snapshot.unread_count; setUnreadCount(snapshot.unread_count); setStale(false)
        failures.current = 0; nextPoll.current = Date.now() + 60_000
        adminReads.expire(`GET:${adminNotificationCountPath}`)
      }
      schedule()
    })
    window.addEventListener('online',active); window.addEventListener('offline',active); window.addEventListener('focus',active); document.addEventListener('visibilitychange',active)
    window.addEventListener('nutrimom:admin-denied',deny); window.addEventListener('nutrimom:session-cleared',deny); window.addEventListener('nutrimom:session-changed',deny)
    return () => {
      subscribed = false; alive.current = false; countController.current?.abort(); pendingCount.current = null; window.clearTimeout(timer)
      for (const controller of pagination.values()) controller.abort()
      pagination.clear(); unsubscribe(); unsubscribeRealtime?.()
      window.removeEventListener('online',active); window.removeEventListener('offline',active); window.removeEventListener('focus',active); document.removeEventListener('visibilitychange',active)
      window.removeEventListener('nutrimom:admin-denied',deny); window.removeEventListener('nutrimom:session-cleared',deny); window.removeEventListener('nutrimom:session-changed',deny)
    }
  },[refreshUnreadCount,reconcile,commit,current])
  useEffect(() => {
    const keys = new Set(visible.current.map(({key}) => key))
    for (const [key,controller] of moreControllers.current) if (!keys.has(key) || !available) { controller.abort(); moreControllers.current.delete(key) }
    setMore((old) => Object.fromEntries(Object.entries(old).filter(([key]) => keys.has(key) && available)))
  },[bellOpen,pageKey,available])

  const refreshAfterWrite = async () => {
    if (!current()) return
    for (const controller of moreControllers.current.values()) controller.abort()
    if (adminRealtime) {
      adminReads.invalidate('GET:/notifications')
      for (const entry of visible.current) {
        if (extended.current.has(entry.key)) setHasNew(old => ({...old,[entry.key]:true}))
        else if (interactive()) entry.resource.revalidate(false,true)
      }
      adminRealtime.wake()
      if (adminRealtime.inspect().state === 'connected') return
    } else adminReads.invalidate('GET:/notifications')
    // No invalidation event: the owner reconciles each visible query and count once.
    if (!adminRealtime && interactive()) for (const entry of visible.current) entry.resource.revalidate(false,true)
    countController.current?.abort(); pendingCount.current = null; suppressCountReconcile.current = true
    setStale(true)
    nextPoll.current = 0
    await refreshUnreadCount()
  }
  const read = (id:string) => mutations.current.run(`read:${id}`,async () => {
    if (!current()) throw new Error('Phiên đăng nhập đã thay đổi.')
    const item = [...feedsRef.current.values()].flatMap((feed) => feed.state.items).find((entry) => entry.id === id)
    if (!item) throw new Error('Thông báo không còn trong danh sách. Vui lòng làm mới.')
    if (item.read_at) return item
    writesRef.current++; setPendingWrites((value) => value + 1)
    try {
      const result = await adminNotificationMutation(`/notifications/${encodeURIComponent(id)}/read`,(p) => normalizeAdminNotification(p))
      if (result.id !== id || !result.read_at) throw new Error('Kết quả đánh dấu đã đọc không đúng hợp đồng.')
      if (!current()) throw new Error('Phiên đăng nhập đã thay đổi.')
      commit((old) => new Map([...old].map(([key,feed]) => [key,{...feed,state:applyAdminRead(feed.state,feed.filter,result)}])))
      await refreshAfterWrite(); return result
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.status === 404) throw new Error('Thông báo không còn khả dụng. Vui lòng làm mới danh sách.')
      throw reason
    } finally { writesRef.current--; if (current()) { setPendingWrites((value) => Math.max(0,value-1)); adminRealtime?.wake() } }
  })
  const readAll = (filter:AdminNotificationFilter) => mutations.current.run(`all:${filter.category || 'ALL'}`,async () => {
    if (!current()) throw new Error('Phiên đăng nhập đã thay đổi.')
    const knownIds = new Set([...feedsRef.current.values()].flatMap((feed) => feed.state.items.map((item) => item.id)))
    writesRef.current++; setPendingWrites((value) => value + 1)
    try {
      const updated = await adminNotificationMutation(buildAdminReadAllPath(filter.category),(p) => normalizeNotificationTotal(p,'updated'))
      if (!current()) throw new Error('Phiên đăng nhập đã thay đổi.')
      if (updated > 0) commit((old) => new Map([...old].map(([key,feed]) => [key,{...feed,state:applyAdminReadAll(feed.state,feed.filter,filter.category,new Date().toISOString(),knownIds)}])))
      await refreshAfterWrite(); return updated
    } finally { writesRef.current--; if (current()) { setPendingWrites((value) => Math.max(0,value-1)); adminRealtime?.wake() } }
  })
  const loadMore = async (key:string,filter:AdminNotificationFilter) => {
    const state = feedsRef.current.get(key)?.state
    if (!current() || !interactive() || !state?.hasMore || !state.nextCursor || moreControllers.current.has(key)) return
    const controller = new AbortController(); moreControllers.current.set(key,controller); setMore((old) => ({...old,[key]:true})); setErrors((old) => ({...old,[key]:''}))
    try {
      const result = await adminRead(buildAdminNotificationsPath(filter,state.nextCursor),(p) => normalizeAdminNotificationPage(p,filter),controller.signal)
      if (!current() || controller.signal.aborted || moreControllers.current.get(key) !== controller) return
      extended.current.add(key)
      commit((old) => { const entry=old.get(key); if (!entry) return old; const next=new Map(old); next.set(key,{...entry,state:notificationPageState(entry.state,result,false)});return next })
    } catch (reason) {
      if (!current() || controller.signal.aborted) return
      if (reason instanceof ApiClientError && reason.status === 422 && cursorRecovery.current.recover(buildAdminNotificationsPath(filter,state.nextCursor))) {
        // One first-page recovery; a failing first page is surfaced without retrying the cursor.
        adminReads.invalidate(`GET:${key}`)
        for (const entry of visible.current) if (entry.key === key) entry.resource.revalidate(false,true)
      } else setErrors((old) => ({...old,[key]:reason instanceof Error ? reason.message : 'Không thể tải thêm thông báo.'}))
    } finally {
      if (moreControllers.current.get(key) === controller) { moreControllers.current.delete(key); if (current()) setMore((old) => ({...old,[key]:false})) }
    }
  }
  function view(key:string,filter:AdminNotificationFilter,resource:typeof bell) {
    const state = denied ? resetNotificationState() : feeds.get(key)?.state || resetNotificationState()
    const retry = () => {
      if (!current() || !interactive() || adminReads.cooldownUntil(`GET:${key}`) > Date.now()) return
      setErrors((old) => ({...old,[key]:''})); moreControllers.current.get(key)?.abort()
      extended.current.delete(key); setHasNew(old => ({...old,[key]:false}))
      adminReads.invalidate(`GET:${key}`)
      for (const entry of visible.current) if (entry.key === key) entry.resource.revalidate(false,true)
    }
    return { ...state, hasNew:Boolean(hasNew[key]),unreadCount,stale,accessDenied:denied,loading:resource.loading,loadingMore:Boolean(more[key]),mutationPending:pendingWrites>0,error:resource.error || errors[key] || '',errorDetail:resource.errorDetail,refresh:async () => retry(),refreshUnreadCount,read,readAll:() => readAll({...filter}),loadMore:() => loadMore(key,filter),retry }
  }
  return { bell:view(bellKey,allFilter,bell),page:view(pageKey,pageFilter || allFilter,page) }
}
export type AdminNotificationFeed = ReturnType<typeof useAdminNotificationOwner>['bell']
export const AdminNotificationContext = createContext<ReturnType<typeof useAdminNotificationOwner> | null>(null)
export function useAdminNotificationFeed(preview = false) { const owner=useContext(AdminNotificationContext); if (!owner) throw new Error('Thiếu Admin notification owner.'); return preview ? owner.bell : owner.page }
