import { CalendarBlank, Heartbeat, WarningCircle, Waveform } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError, isAuthenticationError } from '@/core/api/api-error'
import { formatDate } from '@/core/auth/date'
import { CalendarOverview } from '@/features/calendar/components/CalendarOverview'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { dashboardApi } from '@/features/maternity/api/domain-api'
import { formatEventTime } from '@/features/calendar/model/calendar-helpers'
import { formatVietnamDateTime } from '@/features/family/model/family-formatters'
import { StatusMessage } from '@/shared/components/StatusMessage'
import type { MomDashboard, PartnerDashboard } from '@/types/domain'
import { dashboardGreeting } from '../model/dashboard-greeting'

export function AppHomePage() {
  const { status: authStatus, user, profile } = useAuth()
  const [dashboard, setDashboard] = useState<MomDashboard | null>(null)
  const [partnerDashboard, setPartnerDashboard] = useState<PartnerDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | undefined>(undefined)
  const persona = profile?.role || user?.role
  const isPartner = persona === 'PARTNER' || persona === 'FAMILY_MEMBER'

  const load = useCallback(async () => {
    if (authStatus !== 'authenticated') return
    controller.current?.abort()
    const requestController = new AbortController()
    controller.current = requestController
    setLoading(true); setError('')
    try {
      if (isPartner) setPartnerDashboard(await dashboardApi.partner(requestController.signal))
      else setDashboard(await dashboardApi.mom(requestController.signal))
    }
    catch (reason) {
      if (!(reason instanceof ApiClientError && reason.code === 'REQUEST_ABORTED') && !isAuthenticationError(reason) && !requestController.signal.aborted) {
        setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu tổng quan.')
      }
    }
    finally { if (!requestController.signal.aborted) setLoading(false) }
  }, [authStatus, isPartner])

  useEffect(() => {
    if (authStatus !== 'authenticated') { controller.current?.abort(); return }
    void load()
    const refresh = () => void load()
    window.addEventListener('nutrimom:calendar-changed', refresh)
    return () => { controller.current?.abort(); window.removeEventListener('nutrimom:calendar-changed', refresh) }
  }, [authStatus, load])

  const greeting = isPartner ? { title: `Chào ${profile?.display_name || user?.displayName || 'bạn'}`, subtitle: 'Những thông tin được chia sẻ trong hành trình thai kỳ của gia đình.' } : dashboardGreeting(dashboard)
  const pregnancy = dashboard?.pregnancy_summary
  return <main className="nm-overview-page">
    <section className="nm-overview-hero-band"><div className="nm-overview-inner"><header className="nm-overview-welcome"><span className="nm-eyebrow">Tổng quan hôm nay</span><h1>{greeting.title}</h1><p>{greeting.subtitle}</p></header></div></section>
    <section className="nm-overview-calendar-band"><div className="nm-overview-inner">{error && <StatusMessage tone="error">{error}</StatusMessage>}<CalendarOverview shared={isPartner} pregnancyId={pregnancy?.id} estimatedDueDate={pregnancy?.estimated_due_date || undefined} onChanged={() => void load()} /></div></section>
    <section className="nm-overview-dashboard-content"><div className="nm-overview-inner">{loading ? <div className="dashboard-grid skeleton-grid overview-dashboard"><div /><div /><div /></div> : isPartner ? <>
      <div className="dashboard-grid overview-dashboard"><section className="app-card app-card-highlight"><Heartbeat size={30} weight="duotone" /><p className="card-kicker">Thai kỳ được chia sẻ</p><h2>{partnerDashboard?.pregnancy_overview ? `Tuần ${partnerDashboard.pregnancy_overview.gestational_week} ngày ${partnerDashboard.pregnancy_overview.gestational_day}` : 'Chưa có dữ liệu được chia sẻ'}</h2><p>{partnerDashboard?.pregnancy_overview ? `Tam cá nguyệt ${partnerDashboard.pregnancy_overview.trimester}` : 'Hãy chờ chủ thai kỳ cấp quyền phù hợp.'}</p></section><section className="app-card"><CalendarBlank size={28} weight="duotone" /><p className="card-kicker">Ngày dự sinh</p><h2>{formatDate(partnerDashboard?.pregnancy_overview?.estimated_due_date)}</h2><p>{partnerDashboard?.pregnancy_overview?.care_facility_name || 'Chưa được chia sẻ'}</p></section><section className="app-card"><WarningCircle size={28} weight="duotone" /><p className="card-kicker">Việc được giao</p><h2>{partnerDashboard?.assigned_tasks?.length || 0} việc</h2><p>{partnerDashboard?.assigned_tasks?.[0]?.title || 'Chưa có việc cần thực hiện.'}</p></section></div>
      {partnerDashboard?.activity_feed !== undefined && <section className="app-card content-card"><Waveform size={28} weight="duotone" /><p className="card-kicker">Hoạt động gần đây</p><h2>Cập nhật của gia đình</h2>{partnerDashboard.activity_feed.length ? <div className="guidance-list">{partnerDashboard.activity_feed.slice(0, 3).map((activity) => <article key={activity.id}><strong>{activity.title}</strong><p>{formatVietnamDateTime(activity.created_at)}</p></article>)}</div> : <p>Chưa có hoạt động mới.</p>}<Link className="text-link" to="/app/family?tab=activity">Xem tất cả hoạt động</Link></section>}
      {partnerDashboard?.shared_calendar !== undefined && <section className="app-card content-card"><CalendarBlank size={28} weight="duotone" /><p className="card-kicker">Lịch được chia sẻ</p><h2>Các mốc sắp tới</h2>{partnerDashboard.shared_calendar.length ? <div className="guidance-list">{partnerDashboard.shared_calendar.slice(0, 3).map((event) => <article key={`${event.source}:${event.source_id}:${event.starts_at}`}><strong>{event.title}</strong><p>{formatDate(event.date)} · {formatEventTime(event)}</p></article>)}</div> : <p>Chưa có mốc lịch nào được chia sẻ.</p>}</section>}
    </> : <>
      <div className="dashboard-grid overview-dashboard"><section className="app-card app-card-highlight"><Heartbeat size={30} weight="duotone" /><p className="card-kicker">Hành trình thai kỳ</p>{pregnancy ? <><h2>Tuần {pregnancy.gestational_week} ngày {pregnancy.gestational_day}</h2><p>Tam cá nguyệt {pregnancy.trimester} · còn {pregnancy.days_until_due} ngày</p></> : <><h2>Chưa có hồ sơ thai kỳ</h2><p>Bạn có thể cập nhật khi sẵn sàng.</p></>}</section><section className="app-card"><CalendarBlank size={28} /><p className="card-kicker">Lịch hẹn sắp tới</p><h2>{dashboard?.next_appointment?.title || 'Chưa có lịch hẹn'}</h2><p>{dashboard?.next_appointment ? `${formatDate(dashboard.next_appointment.date)} · ${formatEventTime(dashboard.next_appointment)}` : 'Thêm lịch nhắc để chủ động hơn.'}</p></section><section className="app-card"><WarningCircle size={28} /><p className="card-kicker">Thông báo</p><h2>{dashboard?.unread_notification_count || 0} thông báo mới</h2><p>{dashboard?.care_progress ? `Đã hoàn thành ${dashboard.care_progress.completed}/${dashboard.care_progress.total} mốc chăm sóc.` : 'Chưa có nhắc nhở mới.'}</p></section></div>
      {dashboard?.upcoming_reminders?.length ? <section className="app-card content-card"><h2>Nhắc nhở sắp tới</h2><div className="guidance-list">{dashboard.upcoming_reminders.map((reminder) => <article key={`${reminder.source}:${reminder.source_id}:${reminder.starts_at}`}><strong>{reminder.title}</strong><p>{formatDate(reminder.date)} · {formatEventTime(reminder)}</p>{reminder.subtitle && <small>{reminder.subtitle}</small>}</article>)}</div></section> : null}
    </>}</div></section>
  </main>
}
