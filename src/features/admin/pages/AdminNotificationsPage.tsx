import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { NotificationItem } from '@/features/notifications/model/notification-types'
import { useAdminNotificationFeed } from '../hooks/useAdminNotifications'
import { adaptAdminNotificationLink } from '../model/admin-notification-link'
import { DataState, QueryErrors } from '../components/AdminWorkspaceUI'
import { dateTime } from '../model/admin-workspace-formatters'
import { PageHeading } from '../components/AdminUI'
import { AdminDropdown } from '../components/AdminDropdown'
import { adminCategoryLabels, notificationCategories, parseAdminNotificationQuery } from '../model/admin-notifications'
import { adminNotificationIcon, adminNotificationLabel } from '../components/AdminNotificationCategory'
export function AdminNotificationsPage() {
  const feed = useAdminNotificationFeed()
  const [params,setParams] = useSearchParams()
  const [notice,setNotice] = useState('')
  const navigate = useNavigate()
  const { status,user } = useAuth()
  const query = parseAdminNotificationQuery(params)
  const { valid } = query
  function filter(key:string,value:string | null) { const next=new URLSearchParams(params); if (value === null) next.delete(key); else next.set(key,value); setParams(next); setNotice('') }
  async function activate(item:NotificationItem) {
    try { if (!item.read_at) await feed.read(item.id); const target = adaptAdminNotificationLink(item.deep_link,status === 'authenticated' && Boolean(user?.roles.includes('ADMIN'))); if (target.path) navigate(target.path); else if (target.message) setNotice(target.message) }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Không thể đánh dấu đã đọc.') }
  }
  return <div className="admin-page"><PageHeading title="Thông báo" description={`Tổng hộp thư Admin: ${feed.unreadCount === undefined ? 'chưa có số liệu' : feed.unreadCount + ' chưa đọc'}${feed.stale ? ' · Số liệu chưa được cập nhật' : ''}`} actions={<><button type="button" className="admin-button secondary" disabled={!valid || feed.loading} onClick={feed.retry}>Làm mới</button><button type="button" className="admin-button secondary" disabled={!valid || feed.mutationPending || !feed.unreadCount} onClick={() => void feed.readAll().catch((e:unknown) => setNotice(e instanceof Error ? e.message : 'Không thể đánh dấu đã đọc.'))}>{query.filter.category ? 'Đọc tất cả trong nhóm' : 'Đọc tất cả'}</button></>} />
    <section className="admin-card admin-live-section"><div className="admin-workspace-filters"><AdminDropdown label="Nhóm thông báo" name="category" value={params.get('category') || ''} options={[{value:'',label:'Tất cả'},...notificationCategories.map((category) => ({value:category,label:adminCategoryLabels[category]}))]} onChange={(value) => filter('category',value || null)} /><label className="admin-checkbox"><input type="checkbox" checked={query.filter.unreadOnly} onChange={(e) => filter('unreadOnly',e.target.checked ? 'true' : null)} />Chỉ chưa đọc</label></div><QueryErrors errors={query.errors} onReset={() => setParams({})} />{notice && <p role="status" className="admin-reference-notice">{notice}</p>}
      {valid && feed.hasNew && <button type="button" className="admin-button secondary" onClick={feed.retry}>Có thông báo mới</button>}
      {valid && feed.error && feed.items.length > 0 && <p role="status" className="admin-reference-notice">Chưa cập nhật được danh sách: {feed.error} <button type="button" className="admin-button secondary compact" onClick={feed.retry}>Thử lại</button></p>}
      {valid && <DataState loading={feed.loading} error={!feed.items.length ? feed.error || null : null} empty={!feed.items.length} retry={feed.retry}><ul className="admin-notification-list">{feed.items.map((item) => <li key={item.id} className={item.read_at ? 'is-read' : ''}><div><small className="admin-notification-category">{adminNotificationIcon(item)}{adminNotificationLabel(item)}</small><strong>{item.title}</strong><p>{item.body}</p><small><time dateTime={item.created_at}>{dateTime(item.created_at)}</time> · {item.read_at ? 'Đã đọc' : 'Chưa đọc'}</small></div>{item.deep_link ? <button type="button" disabled={feed.mutationPending} className="admin-button secondary compact" onClick={() => void activate(item)}>Mở</button> : !item.read_at && <button type="button" disabled={feed.mutationPending} className="admin-button secondary compact" onClick={() => void activate(item)}>Đánh dấu đã đọc</button>}</li>)}</ul></DataState>}
      {valid && feed.hasMore && !feed.loading && <button type="button" className="admin-button secondary" disabled={feed.loadingMore} onClick={() => void feed.loadMore()}>{feed.loadingMore ? 'Đang tải…' : 'Tải thêm'}</button>}
    </section>
  </div>
}
