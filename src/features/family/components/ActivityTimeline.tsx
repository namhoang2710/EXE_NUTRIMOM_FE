import { ArrowClockwise, CalendarCheck, CheckCircle, ClipboardText, Handshake, Lifebuoy, XCircle } from '@phosphor-icons/react'
import { activityDayKey, formatVietnamDateTime, memberLabel } from '../model/family-formatters'
import type { ActivityEvent, FamilyMember } from '../model/family-types'
import { useActivityFeed } from '../hooks/useActivityFeed'

const activityIcons = {
  CONSULTATION_ACCEPTED: Handshake,
  CONSULTATION_COMPLETED: CalendarCheck,
  CONSULTATION_CANCELLED: XCircle,
  CONTACT_COMPLETED: Lifebuoy,
  FAMILY_TASK_ASSIGNED: ClipboardText,
  FAMILY_TASK_COMPLETED: CheckCircle,
} satisfies Record<ActivityEvent['type'], typeof CheckCircle>

interface Props { enabled: boolean; members: FamilyMember[] }

export function ActivityTimeline({ enabled, members }: Props) {
  const feed = useActivityFeed(enabled)
  if (!enabled) return <div className="family-no-access"><ClipboardText size={36} weight="duotone" aria-hidden="true" /><h2>Hoạt động chưa được chia sẻ</h2><p>Chủ nhóm chưa cấp quyền Hoạt động cho tài khoản của bạn.</p></div>
  const groups = feed.items.reduce<Array<{ day: string; items: ActivityEvent[] }>>((result, item) => {
    const day = activityDayKey(item.created_at)
    const existing = result.find((group) => group.day === day)
    if (existing) existing.items.push(item)
    else result.push({ day, items: [item] })
    return result
  }, [])

  return <section className="family-section" aria-labelledby="family-activity-title">
    <div className="family-section-heading"><div><h2 id="family-activity-title">Hoạt động</h2><p>Các cập nhật do máy chủ cung cấp, mới nhất hiển thị trước.</p></div><button className="secondary-button" type="button" disabled={feed.loading} onClick={() => void feed.refresh()}><ArrowClockwise size={18} aria-hidden="true" />Làm mới</button></div>
    {feed.loading ? <div className="family-activity-skeleton" aria-busy="true" aria-label="Đang tải hoạt động"><span /><span /><span /></div> : feed.error ? <div className="family-empty is-error" role="alert"><XCircle size={38} weight="duotone" aria-hidden="true" /><h3>Chưa tải được hoạt động</h3><p>{feed.error}</p><button className="secondary-button" type="button" onClick={() => void feed.refresh()}>Thử lại</button></div> : groups.length ? <div className="family-timeline">{groups.map((group) => <section key={group.day}><h3>{group.day}</h3><div>{group.items.map((item) => { const Icon = activityIcons[item.type]; const actor = item.actor_user_id ? members.find((member) => member.user_id === item.actor_user_id) : undefined; return <article key={item.id}><span className="family-timeline-icon"><Icon size={20} weight="duotone" aria-hidden="true" /></span><div><h4>{item.title}</h4><p>{item.actor_user_id ? memberLabel(actor) : 'Hoạt động hệ thống'}</p><time dateTime={item.created_at}>{formatVietnamDateTime(item.created_at)}</time></div></article> })}</div></section>)}</div> : <div className="family-empty"><ClipboardText size={40} weight="duotone" aria-hidden="true" /><h3>Chưa có hoạt động</h3><p>Các cập nhật phù hợp với quyền chia sẻ sẽ xuất hiện tại đây.</p></div>}
    {feed.hasMore && !feed.error && <div className="family-load-more"><button className="secondary-button" type="button" disabled={feed.loadingMore} onClick={() => void feed.loadMore()}>{feed.loadingMore ? 'Đang tải...' : 'Tải thêm'}</button></div>}
  </section>
}
