import { Bell, CalendarBlank, ChatCircleText, HouseLine, Info, UsersThree } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiClientError, isAuthenticationError } from '@/core/api/api-error'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { adaptDeepLink, notificationTypeLabel } from '../model/notification-helpers'
import type { NotificationItem } from '../model/notification-types'
import { DiagnosticCopyButton } from '@/shared/components/DiagnosticCopyButton'

const icons = { CONSULTATION: ChatCircleText, CONTACT: Info, FAMILY: UsersThree, REMINDER: CalendarBlank, SYSTEM: HouseLine }

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

export function NotificationBell() {
  const { status: authStatus } = useAuth()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()
  const authenticated = authStatus === 'authenticated'
  const feed = useNotifications(authenticated, open)
  const refreshNotifications = feed.refresh
  const fallbackUnread = feed.items.some((item) => !item.read_at)

  useEffect(() => {
    if (!authenticated || !open) return
    void refreshNotifications()
    const closeOutside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) { setOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [authenticated, open, refreshNotifications])
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
    const target = adaptDeepLink(item.deep_link)
    if (target.path) { close(); navigate(target.path) }
    else if (target.message) setNotice(target.message)
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    const active = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'ArrowDown' && itemRefs.current.length) { event.preventDefault(); itemRefs.current[(active + 1 + itemRefs.current.length) % itemRefs.current.length]?.focus() }
    if (event.key === 'ArrowUp' && itemRefs.current.length) { event.preventDefault(); itemRefs.current[(active - 1 + itemRefs.current.length) % itemRefs.current.length]?.focus() }
  }

  return <div className="nm-notification-root" ref={rootRef}>
    <button ref={triggerRef} className="nm-notification-trigger" type="button" aria-label="Thông báo" aria-expanded={open} aria-controls="nm-notification-panel" onClick={() => { setOpen((value) => !value); setNotice('') }}>
      <Bell size={22} weight={fallbackUnread || (feed.unreadCount ?? 0) > 0 ? 'fill' : 'regular'} />
      {feed.unreadCount !== undefined && feed.unreadCount > 0 ? <span className="nm-notification-badge" aria-label={`${feed.unreadCount} thông báo chưa đọc`}>{feed.unreadCount > 99 ? '99+' : feed.unreadCount}</span> : feed.unreadCount === undefined && fallbackUnread ? <span className="nm-notification-dot" aria-label="Có thông báo chưa đọc" /> : null}
    </button>
    <AnimatePresence initial={false}>
      {open && <motion.div id="nm-notification-panel" className="nm-notification-panel" role="dialog" aria-label="Hộp thông báo" initial={reduceMotion ? false : { opacity: 0, y: -10, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: .98 }} transition={{ duration: reduceMotion ? 0 : .2 }} onKeyDown={onPanelKeyDown}>
        <header><div><span>Cập nhật mới</span><h2>Thông báo</h2></div><button type="button" disabled={!feed.items.some((item) => !item.read_at)} onClick={() => void feed.readAll().catch((reason: unknown) => showActionError(reason, 'Không thể đánh dấu tất cả đã đọc.'))}>Đánh dấu tất cả đã đọc</button></header>
        {notice && <p className="nm-notification-notice" role="status">{notice}</p>}
        <div className="nm-notification-list no-visible-scrollbar">
          {feed.loading ? Array.from({ length: 4 }, (_, index) => <div className="nm-notification-skeleton" key={index} />) : feed.error ? <div className="nm-notification-state"><p>{feed.error}</p><DiagnosticCopyButton feature="notification" event="list_failed" error={feed.errorDetail} /><button type="button" onClick={() => void feed.refresh()}>Thử lại</button></div> : feed.items.length === 0 ? <div className="nm-notification-state"><Bell size={32} /><strong>Chưa có thông báo</strong><p>Các cập nhật quan trọng sẽ xuất hiện tại đây.</p></div> : feed.items.map((item, index) => {
            const Icon = icons[item.type] || Info
            return <button ref={(node) => { itemRefs.current[index] = node }} type="button" className={`nm-notification-item${item.read_at ? ' is-read' : ''}`} key={item.id} onClick={() => void activate(item)}><span className={`nm-notification-icon is-${item.type.toLowerCase()}`}><Icon size={20} /></span><span className="nm-notification-copy"><span><small>{notificationTypeLabel(item.type)}</small><time dateTime={item.created_at}>{relativeTime(item.created_at)}</time></span><strong>{item.title}</strong><p>{item.body}</p></span>{!item.read_at && <i aria-label="Chưa đọc" />}</button>
          })}
        </div>
        {feed.hasMore && !feed.loading && <button className="nm-notification-more" type="button" disabled={feed.loadingMore} onClick={() => void feed.loadMore()}>{feed.loadingMore ? 'Đang tải...' : 'Tải thêm'}</button>}
      </motion.div>}
    </AnimatePresence>
  </div>
}
