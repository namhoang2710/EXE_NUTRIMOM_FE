import { Bell, Checks } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { useCommunityNotifications } from '../hooks/useCommunityNotifications'
import type { CommunityNotification } from '../model/community-types'
import { relativeTime } from '../model/community-time'

/**
 * Nút + panel thông báo của riêng Cộng đồng (không dùng chuông header).
 * `inline`: panel mở ngay dưới nút (dùng trong cột phải desktop, nơi dropdown nổi bị cắt khi cột cuộn).
 */
export function CommunityNotificationsPanel({ onOpenPost, inline = false }: { onOpenPost: (postId: string) => void; inline?: boolean }) {
  const [open, setOpen] = useState(false)
  const notifications = useCommunityNotifications(open)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function select(notification: CommunityNotification) {
    void notifications.markRead(notification)
    setOpen(false)
    onOpenPost(notification.post_id)
  }

  return <div className={`nm-community-notify${inline ? ' is-inline' : ''}`} ref={rootRef}>
    <button type="button" className="nm-secondary-action nm-community-notify__trigger" aria-expanded={open} aria-controls="nm-community-notify-panel" onClick={() => setOpen(!open)}>
      <Bell size={18} aria-hidden="true" />Thông báo
      {notifications.unread > 0 && <span className="nm-community-badge" aria-label={`${notifications.unread} chưa đọc`}>{notifications.unread > 99 ? '99+' : notifications.unread}</span>}
    </button>
    {open && <section id="nm-community-notify-panel" className="nm-community-notify__panel" aria-label="Thông báo cộng đồng">
      <header><h2>Thông báo cộng đồng</h2>{notifications.unread > 0 && <button type="button" className="nm-community-link" onClick={() => void notifications.markAllRead()}><Checks size={16} aria-hidden="true" />Đã đọc tất cả</button>}</header>
      {notifications.loading && notifications.items.length === 0 && <p className="nm-community-muted" role="status">Đang tải…</p>}
      {notifications.error && <p className="nm-community-error" role="alert">{notifications.error} <button type="button" className="nm-community-link" onClick={notifications.retry}>Thử lại</button></p>}
      {!notifications.loading && !notifications.error && notifications.items.length === 0 && <p className="nm-community-muted">Chưa có thông báo nào.</p>}
      <ul>
        {notifications.items.map((item) => <li key={item.id}>
          <button type="button" className={item.read ? '' : 'is-unread'} onClick={() => select(item)}>
            <span>{item.message}</span><time dateTime={item.created_at}>{relativeTime(item.created_at)}</time>
          </button>
        </li>)}
      </ul>
      {notifications.hasMore && <button type="button" className="nm-community-link" disabled={notifications.loading} onClick={notifications.loadMore}>Xem thêm</button>}
    </section>}
  </div>
}
