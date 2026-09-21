import { CalendarBlank, Heartbeat, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FeaturePage as AppShell } from '@/shared/layouts/FeaturePage'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { dashboardApi } from '@/features/maternity/api/domain-api'
import { formatDate } from '@/core/auth/date'
import type { MomDashboard, PartnerDashboard } from '@/types/domain'

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<MomDashboard | null>(null)
  const [partnerDashboard, setPartnerDashboard] = useState<PartnerDashboard | null>(null)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const isPartner = user?.role === 'PARTNER' || user?.role === 'FAMILY_MEMBER'
  useEffect(() => { void (isPartner ? dashboardApi.partner().then(setPartnerDashboard) : dashboardApi.mom().then(setDashboard)).catch((reason: Error) => setError(reason.message)) }, [isPartner])
  if (isPartner) return <AppShell><div className="page-heading"><p className="welcome-kicker">Tổng quan gia đình</p><h1>Chào {user?.displayName}</h1><p>Những thông tin được chia sẻ trong hành trình thai kỳ.</p></div>{error && <StatusMessage tone="error">{error}</StatusMessage>}{!partnerDashboard && !error ? <div className="dashboard-grid skeleton-grid"><div /><div /><div /></div> : <div className="dashboard-grid"><section className="app-card app-card-highlight"><Heartbeat size={30} weight="duotone" /><p className="card-kicker">Thai kỳ được chia sẻ</p><h2>{partnerDashboard?.pregnancy_overview ? `Tuần ${partnerDashboard.pregnancy_overview.gestational_week} ngày ${partnerDashboard.pregnancy_overview.gestational_day}` : 'Chưa có dữ liệu được chia sẻ'}</h2><p>{partnerDashboard?.pregnancy_overview ? `Tam cá nguyệt ${partnerDashboard.pregnancy_overview.trimester}` : 'Hãy chờ chủ thai kỳ cấp quyền phù hợp.'}</p></section><section className="app-card"><CalendarBlank size={28} weight="duotone" /><p className="card-kicker">Ngày dự sinh</p><h2>{formatDate(partnerDashboard?.pregnancy_overview?.estimated_due_date)}</h2><p>{partnerDashboard?.pregnancy_overview?.care_facility_name || 'Chưa được chia sẻ'}</p></section><section className="app-card"><WarningCircle size={28} weight="duotone" /><p className="card-kicker">Việc được giao</p><h2>{partnerDashboard?.assigned_tasks?.length || 0} việc</h2><p>{partnerDashboard?.assigned_tasks?.[0]?.title || 'Chưa có việc cần thực hiện.'}</p></section></div>}</AppShell>
  const pregnancy = dashboard?.pregnancy_summary
  return <AppShell><div className="page-heading"><p className="welcome-kicker">Tổng quan hôm nay</p><h1>{dashboard?.profile_summary?.salutation || 'Chào bạn'}{dashboard?.profile_summary?.display_name ? `, ${dashboard.profile_summary.display_name}` : ''}</h1><p>Những thông tin quan trọng cho hành trình thai kỳ của bạn.</p></div>
    {error && <StatusMessage tone="error">{error}</StatusMessage>}
    {!dashboard && !error ? <div className="dashboard-grid skeleton-grid"><div /><div /><div /></div> : <>
      <div className="dashboard-grid">
        <section className="app-card app-card-highlight"><Heartbeat size={30} weight="duotone" /><p className="card-kicker">Hành trình thai kỳ</p>{pregnancy ? <><h2>Tuần {pregnancy.gestational_week} ngày {pregnancy.gestational_day}</h2><p>Tam cá nguyệt {pregnancy.trimester} · còn {pregnancy.days_until_due} ngày</p><Link className="text-link" to="/app/health">Xem sức khỏe thai kỳ</Link></> : <><h2>Chưa có hồ sơ thai kỳ</h2><p>Bạn có thể cập nhật khi sẵn sàng.</p><Link className="text-link" to="/app/health">Cập nhật tuổi thai</Link></>}</section>
        <section className="app-card"><CalendarBlank size={28} weight="duotone" /><p className="card-kicker">Ngày dự sinh</p><h2>{formatDate(pregnancy?.estimated_due_date)}</h2><p>{pregnancy?.care_facility_name || 'Chưa cập nhật cơ sở chăm sóc'}</p></section>
        <section className="app-card"><WarningCircle size={28} weight="duotone" /><p className="card-kicker">Việc cần lưu ý</p><h2>{dashboard?.unread_notification_count || 0} thông báo mới</h2><p>{dashboard?.care_progress ? `Đã hoàn thành ${dashboard.care_progress.completed}/${dashboard.care_progress.total} mốc chăm sóc.` : 'Chưa có nhắc nhở mới.'}</p></section>
      </div>
      {dashboard?.baby_summary && <section className="app-card content-card"><p className="card-kicker">Bé yêu tuần {dashboard.baby_summary.week}</p><h2>{dashboard.baby_summary.title || 'Phát triển của bé'}</h2><p>{dashboard.baby_summary.summary || dashboard.baby_summary.baby_development}</p><Link className="text-link" to="/app/health">Khám phá nội dung theo tuần</Link></section>}
    </>}
  </AppShell>
}
