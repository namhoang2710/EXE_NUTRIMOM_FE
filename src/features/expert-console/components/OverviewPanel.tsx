import { ArrowRight, CalendarCheck, CalendarDots, ChatCenteredDots, Clock, Star } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { expertConsoleApi } from '../api/expert-console-api'
import { useExpertResource } from '../hooks/useExpertResource'
import { formatDate, formatTime } from '../model/expert-console-formatters'
import { sortConsultationsNewestFirst } from '../model/expert-console-time'
import type { ExpertOverview, ExpertProfile } from '../model/expert-console-types'
import { PanelHeading, ResourceState } from './ExpertUI'

export function OverviewPanel({ profile, overview, loading, error, retry, onNavigate, refreshToken }: {
  profile: ExpertProfile | null
  overview: ExpertOverview | null
  loading: boolean
  error: string
  retry: () => void
  onNavigate: (section: string, values?: Record<string, string | undefined>) => void
  refreshToken: number
}) {
  const upcoming = useExpertResource((signal) => expertConsoleApi.consultations({ type: 'assigned', status: 'PENDING_CONSULTATION', page: 1, pageSize: 4 }, signal), [refreshToken])
  const orderedUpcoming = useMemo(() => sortConsultationsNewestFirst(upcoming.data?.items ?? []), [upcoming.data?.items])
  return (
    <section className="expert-overview">
      <PanelHeading eyebrow="Tổng quan hôm nay" title={`Chào ${profile?.title ? `${profile.title} ` : ''}${profile?.fullName || 'bạn'}`} description="Một góc nhìn nhanh về lịch làm việc và những việc cần ưu tiên." />
      <ResourceState loading={loading} error={error} empty={!overview} onRetry={retry}>
        <div className="expert-metrics">
          <button type="button" onClick={() => onNavigate('schedule')}><span className="violet"><CalendarCheck size={22} weight="duotone" /></span><div><small>Lịch sắp tới</small><strong>{overview?.upcomingConsultations ?? 0}</strong><p>Buổi đã được xếp lịch</p></div><ArrowRight size={17} /></button>
          <button type="button" onClick={() => onNavigate('requests', { request_type: 'pool' })}><span className="amber"><ChatCenteredDots size={22} weight="duotone" /></span><div><small>Đang chờ nhận</small><strong>{overview?.pendingRequests ?? 0}</strong><p>Yêu cầu random trong pool</p></div><ArrowRight size={17} /></button>
          <button type="button" onClick={() => onNavigate('slots')}><span className="green"><CalendarDots size={22} weight="duotone" /></span><div><small>Khung giờ còn mở hôm nay</small><strong>{overview?.openToday ?? 0} slot</strong><p>{overview?.today ? formatDate(overview.today) : 'Đang tải ngày làm việc'}</p></div><ArrowRight size={17} /></button>
          <button type="button" onClick={() => onNavigate('reviews')}><span className="rose"><Star size={22} weight="duotone" /></span><div><small>Điểm đánh giá</small><strong>{profile?.ratingCount ? profile.averageRating.toFixed(1) : 'Chưa có'}</strong><p>{profile?.ratingCount ?? 0} lượt đánh giá</p></div><ArrowRight size={17} /></button>
        </div>
      </ResourceState>
      <div className="expert-overview-grid">
        <section className="expert-panel compact">
          <header className="expert-card-title"><div><span>Lịch kế tiếp</span><h2>Các buổi sắp diễn ra</h2></div><button type="button" onClick={() => onNavigate('schedule')}>Xem tất cả <ArrowRight size={15} /></button></header>
          <ResourceState loading={upcoming.loading} error={upcoming.error} empty={!upcoming.data?.items.length} onRetry={upcoming.reload} emptyTitle="Chưa có lịch tư vấn sắp tới" emptyMessage="Các lịch được đặt sẽ xuất hiện tại đây.">
            <div className="expert-upcoming-list">{orderedUpcoming.map((item) => <article key={item.id}><div className="expert-upcoming-time"><strong>{item.slot ? formatTime(item.slot.startTime) : 'Chưa xếp lịch'}</strong><small>{item.slot ? formatDate(item.slot.date) : 'Chưa xếp lịch'}</small></div><span className="expert-timeline-dot" /><div><strong>{item.userDisplayName || 'Người dùng'}</strong><p>{item.note || 'Tư vấn sức khỏe'}</p></div></article>)}</div>
          </ResourceState>
        </section>
        <aside className="expert-focus-card">
          <span><Clock size={24} weight="duotone" /></span>
          <small>Gợi ý vận hành</small>
          <h2>Giữ lịch làm việc chính xác</h2>
          <p>Đóng những khung giờ bận để người dùng và yêu cầu trong hàng chờ luôn chọn đúng lịch còn trống.</p>
          <button type="button" onClick={() => onNavigate('slots')}>Quản lý lịch làm việc <ArrowRight size={16} /></button>
        </aside>
      </div>
    </section>
  )
}

