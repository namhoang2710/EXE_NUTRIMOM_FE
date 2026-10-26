import { Bell, CalendarBlank, ChatCircleText, HouseLine, Info, UsersThree } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ApiClientError, isAuthenticationError } from '@/core/api/api-error'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { adaptDeepLink, newNotificationCount, notificationTypeLabel } from '../model/notification-helpers'
import type { NotificationItem } from '../model/notification-types'
import { DiagnosticCopyButton } from '@/shared/components/DiagnosticCopyButton'
import { ResponsiveModal } from '@/shared/components/ResponsiveModal'
import { compactNotificationBody } from '@/shared/model/display-copy'

const icons = { CONSULTATION: ChatCircleText, CONTACT: Info, FAMILY: UsersThree, REMINDER: CalendarBlank, SYSTEM: HouseLine }
const NEW_NOTIFICATION_FEEDBACK_MS = 800

function relativeTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Thời gian không hợp lệ'
  const minutes = Math.round((date.getTime() - Date.now()) / 60000)
  const formatter = new Intl.RelativeTimeFormat('vi-VN', { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour')
  return formatter.format(Math.round(hours / 24), 'day')
}

export function NotificationBell({adaptLink=adaptDeepLink}:{adaptLink?:typeof adaptDeepLink}) {
  const { status: authStatus } = useAuth()
  const [open, setOpen] = useState(false)
  const authenticated = authStatus === 'authenticated'
  const feed = useNotifications(authenticated, open)
  return <NotificationBellView open={open} setOpen={setOpen} authenticated={authenticated} feed={feed} adaptLink={adaptLink} />
}

export function NotificationBellView({ open, setOpen, authenticated, feed, adaptLink = adaptDeepLink, pending = false, loadOnOpen = true, allPath, itemLabel, itemIcon, formatTime, panelClassName = '' }: {
  open: boolean; setOpen: (open: boolean | ((value: boolean) => boolean)) => void; authenticated: boolean;
  feed: ReturnType<typeof useNotifications> & { hasNew?: boolean }; adaptLink?: typeof adaptDeepLink; pending?: boolean; loadOnOpen?: boolean;
  allPath?: string; itemLabel?: (item: NotificationItem) => string; itemIcon?: (item: NotificationItem) => ReactNode; formatTime?: (value: string) => string;
  panelClassName?: string;
}) {
  const [notice, setNotice] = useState('')
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const previousUnreadCount = useRef<number | undefined>(undefined)
  const feedbackTimer = useRef<number | undefined>(undefined)
  const [newNotifications, setNewNotifications] = useState(0)
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()
  const refreshNotifications = feed.refresh
  const refreshNotificationsRef = useRef(refreshNotifications)
  refreshNotificationsRef.current = refreshNotifications
  const fallbackUnread = feed.items.some((item) => !item.read_at)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const update = () => setMobile(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  // Escape the header's backdrop-filter containing block. Keep desktop anchored
  // to its bell and leave mobile placement to the existing bottom-sheet CSS.
  useLayoutEffect(() => {
    if (!open || mobile) return
    let frame = 0
    function positionPanel() {
      const trigger = triggerRef.current?.getBoundingClientRect()
      const panel = panelRef.current
      if (!trigger || !panel) return
      const width = window.innerWidth
      const height = window.innerHeight
      const top = Math.max(8, Math.min(trigger.bottom + 14, height - 120))
      const panelWidth = Math.min(420, width - 24)
      const right = Math.max(12, Math.min(width - trigger.right - 60, width - panelWidth - 12))
      panel.style.setProperty('--notification-top', `${top}px`)
      panel.style.setProperty('--notification-right', `${right}px`)
      panel.style.setProperty('--notification-max-height', `${Math.max(0, height - top - 12)}px`)
    }
    function schedulePosition() {
      if (frame) return
      frame = window.requestAnimationFrame(() => { frame = 0; positionPanel() })
    }
    positionPanel()
    panelRef.current?.focus({ preventScroll: true })
    window.addEventListener('resize', schedulePosition)
    window.addEventListener('scroll', schedulePosition, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedulePosition)
      window.removeEventListener('scroll', schedulePosition, true)
    }
  }, [open, mobile])

  useEffect(() => {
    const nextUnreadCount = feed.unreadCount
    const increase = newNotificationCount(previousUnreadCount.current, nextUnreadCount)
    previousUnreadCount.current = nextUnreadCount
    if (increase === 0) return

    setNewNotifications(increase)
    if (feedbackTimer.current !== undefined) window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => {
      feedbackTimer.current = undefined
      setNewNotifications(0)
    }, NEW_NOTIFICATION_FEEDBACK_MS)
  }, [feed.unreadCount])

  useEffect(() => () => {
    if (feedbackTimer.current !== undefined) window.clearTimeout(feedbackTimer.current)
  }, [])

  useEffect(() => {
    if (authenticated && open && loadOnOpen) void refreshNotificationsRef.current()
  }, [authenticated, open, loadOnOpen])

  useEffect(() => {
    if (!authenticated || !open) return
    if (mobile) return
    const closeOutside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) { setOpen(false); triggerRef.current?.focus() } }
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { setOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', escape) }
  }, [authenticated, open, setOpen, mobile])
  useEffect(() => {
    itemRefs.current.length = open ? feed.items.length : 0
  }, [feed.items.length, open])

  function close() { setOpen(false); triggerRef.current?.focus() }

  function showActionError(reason: unknown, fallback: string) {
    if (isAuthenticationError(reason) || (reason instanceof ApiClientError && reason.code === 'REQUEST_ABORTED')) return
    setNotice(reason instanceof Error ? reason.message : fallback)
  }

  async function activate(item: NotificationItem) {
    try { if (!item.read_at) await feed.read(item.id) }
    catch (reason) { showActionError(reason, 'Không thể đánh dấu đã đọc.'); return }
    const target = adaptLink(item.deep_link)
    if (target.path) { close(); navigate(target.path) }
    else if (target.message) setNotice(target.message)
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    const interactiveItems = itemRefs.current.filter((item): item is HTMLButtonElement => Boolean(item))
    const active = interactiveItems.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'ArrowDown' && interactiveItems.length) { event.preventDefault(); interactiveItems[(active + 1 + interactiveItems.length) % interactiveItems.length]?.focus() }
    if (event.key === 'ArrowUp' && interactiveItems.length) { event.preventDefault(); interactiveItems[(active - 1 + interactiveItems.length) % interactiveItems.length]?.focus() }
  }

  const hasNewNotifications = newNotifications > 0
  const feedbackClass = hasNewNotifications ? reduceMotion ? ' is-new-reduced' : ' is-new' : ''
  const liveMessage = newNotifications === 1 ? 'Bạn có một thông báo mới.' : newNotifications > 1 ? `Bạn có ${newNotifications} thông báo mới.` : ''
  const content = <>
        <header className="nm-notification-actions">{!mobile && <div><span>Cập nhật mới</span><h2>Thông báo</h2></div>}<button type="button" disabled={pending || (allPath ? feed.unreadCount === 0 || feed.unreadCount === undefined : !feed.items.some((item) => !item.read_at))} onClick={() => void feed.readAll().catch((reason: unknown) => showActionError(reason, 'Không thể đánh dấu tất cả đã đọc.'))}>Đánh dấu tất cả đã đọc</button></header>
        {notice && <p className="nm-notification-notice" role="status">{notice}</p>}
        {feed.hasNew && <button className="nm-notification-more" type="button" onClick={() => void feed.refresh()}>Có thông báo mới</button>}
        <div className="nm-notification-list no-visible-scrollbar">
          {feed.loading && feed.items.length > 0 && <p className="nm-notification-notice" role="status">Đang cập nhật…</p>}
          {feed.error && feed.items.length > 0 && <p className="nm-notification-notice" role="status">{feed.error} <button type="button" onClick={() => void feed.refresh()}>Thử lại</button></p>}
          {feed.loading && !feed.items.length ? Array.from({ length: 4 }, (_, index) => <div className="nm-notification-skeleton" key={index} />) : feed.error && !feed.items.length ? <div className="nm-notification-state"><p>{feed.error}</p><DiagnosticCopyButton feature="notification" event="list_failed" error={feed.errorDetail} /><button type="button" onClick={() => void feed.refresh()}>Thử lại</button></div> : feed.items.length === 0 ? <div className="nm-notification-state"><Bell size={32} /><strong>Chưa có thông báo</strong><p>Các cập nhật quan trọng sẽ xuất hiện tại đây.</p></div> : feed.items.map((item, index) => {
            const Icon = icons[item.type] || Info
            const content = <><span className={`nm-notification-icon is-${item.type.toLowerCase()}`}>{itemIcon ? itemIcon(item) : <Icon size={20} />}</span><span className="nm-notification-copy"><span><small>{itemLabel ? itemLabel(item) : notificationTypeLabel(item.type)}</small><time dateTime={item.created_at}>{formatTime ? formatTime(item.created_at) : relativeTime(item.created_at)}</time></span><strong>{item.title}</strong><p>{compactNotificationBody(item.body)}</p></span></>
            if (!item.deep_link) return <article className={`nm-notification-item is-static${item.read_at ? ' is-read' : ''}`} key={item.id}>{content}{!item.read_at && <button className="nm-notification-read" type="button" onClick={() => void feed.read(item.id).catch((reason: unknown) => showActionError(reason, 'Không thể đánh dấu đã đọc.'))}>Đánh dấu đã đọc</button>}</article>
            return <button ref={(node) => { itemRefs.current[index] = node }} type="button" className={`nm-notification-item${item.read_at ? ' is-read' : ''}`} key={item.id} onClick={() => void activate(item)}>{content}{!item.read_at && <i aria-label="Chưa đọc" />}</button>
          })}
        </div>
        {feed.hasMore && !feed.loading && <button className="nm-notification-more" type="button" disabled={feed.loadingMore} onClick={() => void feed.loadMore()}>{feed.loadingMore ? 'Đang tải...' : 'Tải thêm'}</button>}
        {allPath && <button className="nm-notification-more" type="button" onClick={() => { close(); navigate(allPath) }}>Xem tất cả</button>}
    </>
  return <div className="nm-notification-root" ref={rootRef}>
    <span className="sr-only" aria-live="polite" aria-atomic="true">{liveMessage}</span>
    <button ref={triggerRef} className={`nm-notification-trigger${feedbackClass}`} type="button" disabled={!authenticated} aria-label="Thông báo" aria-expanded={open} aria-controls="nm-notification-panel" onClick={() => { setOpen((value) => !value); setNotice('') }}>
      <span className="nm-notification-bell-icon" aria-hidden="true"><Bell size={22} weight={fallbackUnread || (feed.unreadCount ?? 0) > 0 ? 'fill' : 'regular'} /></span>
      {feed.unreadCount !== undefined && feed.unreadCount > 0 ? <span className="nm-notification-badge" aria-label={`${feed.unreadCount} thông báo chưa đọc`}>{feed.unreadCount > 99 ? '99+' : feed.unreadCount}</span> : feed.unreadCount === undefined && fallbackUnread ? <span className="nm-notification-dot" aria-label="Có thông báo chưa đọc" /> : null}
    </button>
    {mobile ? <ResponsiveModal open={open} onOpenChange={next => { setOpen(next); if (!next) triggerRef.current?.focus() }} title="Thông báo" className="nm-notification-sheet"><div id="nm-notification-panel" onKeyDown={onPanelKeyDown}>{content}</div></ResponsiveModal> : createPortal(<AnimatePresence initial={false}>
      {open && <motion.div ref={panelRef} tabIndex={-1} id="nm-notification-panel" className={`nm-notification-panel ${panelClassName}`.trim()} role="dialog" aria-label="Hộp thông báo" initial={reduceMotion ? false : { opacity: 0, y: -10, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: .98 }} transition={{ duration: reduceMotion ? 0 : .2 }} onKeyDown={onPanelKeyDown}>
        {content}
      </motion.div>}
    </AnimatePresence>, document.body)}
  </div>
}
