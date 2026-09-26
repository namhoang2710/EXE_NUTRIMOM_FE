import { CalendarBlank, CalendarDots, ChartPieSlice, FirstAidKit, List, SignOut, Star, UsersThree, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { expertConsoleApi } from '../api/expert-console-api'
import { OverviewPanel } from '../components/OverviewPanel'
import { RequestsPanel } from '../components/RequestsPanel'
import { ReviewsPanel } from '../components/ReviewsPanel'
import { SchedulePanel } from '../components/SchedulePanel'
import { SlotsPanel } from '../components/SlotsPanel'
import { useExpertResource } from '../hooks/useExpertResource'
import { specialtyLabels } from '../model/expert-console-types'
import '../styles/expert-console.css'

const sections = ['overview', 'schedule', 'requests', 'slots', 'reviews'] as const
type Section = (typeof sections)[number]

const navigation = [
  { id: 'overview' as const, label: 'Tổng quan', icon: ChartPieSlice },
  { id: 'schedule' as const, label: 'Lịch tư vấn', icon: CalendarBlank },
  { id: 'requests' as const, label: 'Yêu cầu tư vấn', icon: UsersThree },
  { id: 'slots' as const, label: 'Khung giờ trống', icon: CalendarDots },
  { id: 'reviews' as const, label: 'Đánh giá', icon: Star },
]

export function ExpertDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const active = sections.includes(searchParams.get('section') as Section) ? searchParams.get('section') as Section : 'overview'
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const profile = useExpertResource((signal) => expertConsoleApi.profile(signal), [])
  const overview = useExpertResource((signal) => expertConsoleApi.overview(signal), [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const setParams = useCallback((values: Record<string, string | undefined>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setSection = useCallback((section: string) => {
    setParams({ section: section === 'overview' ? undefined : section })
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [setParams])

  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => setToast({ message, tone }), [])
  const initials = useMemo(() => profile.data?.fullName.split(/\s+/).slice(-2).map((word) => word[0]).join('').toUpperCase() || 'NM', [profile.data])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="expert-shell">
      <aside className={`expert-sidebar${menuOpen ? ' is-open' : ''}`}>
        <div className="expert-brand"><img src="/nutrimom-logo.png" alt="" width="38" height="38" /><div><strong>NutriMom</strong><span>Expert Console</span></div><button type="button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
        <nav aria-label="Điều hướng Expert Console">{navigation.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} className={active === item.id ? 'is-active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => setSection(item.id)}><Icon size={20} weight={active === item.id ? 'fill' : 'regular'} /><span>{item.label}</span></button> })}</nav>
        <div className="expert-sidebar-profile"><span className="expert-avatar small">{profile.data?.avatarUrl ? <img src={profile.data.avatarUrl} alt="" /> : initials}</span><div><strong>{profile.data?.fullName || 'Chuyên gia NutriMom'}</strong><small>{profile.data ? specialtyLabels[profile.data.specialty] : 'Đang tải hồ sơ'}</small></div></div>
      </aside>
      {menuOpen && <button className="expert-sidebar-backdrop" type="button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <div className="expert-workspace">
        <header className="expert-topbar"><button className="expert-menu-button" type="button" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><List size={22} /></button><div className="expert-topbar-context"><FirstAidKit size={20} weight="duotone" /><span>Không gian làm việc chuyên gia</span></div><div className="expert-topbar-actions"><ThemeToggle /><button className="expert-logout" type="button" onClick={() => void handleLogout()}><SignOut size={18} /><span>Đăng xuất</span></button></div></header>
        <main className="expert-content">
          {profile.error && <div className="expert-profile-error" role="alert">Không thể tải hồ sơ chuyên gia. <button type="button" onClick={() => void profile.reload()}>Thử lại</button></div>}
          {active === 'overview' && <OverviewPanel profile={profile.data} overview={overview.data} loading={overview.loading} error={overview.error} retry={overview.reload} onNavigate={setSection} />}
          {active === 'schedule' && <SchedulePanel search={searchParams} setParams={setParams} notify={notify} onMutate={overview.reload} />}
          {active === 'requests' && <RequestsPanel search={searchParams} setParams={setParams} notify={notify} onMutate={overview.reload} />}
          {active === 'slots' && <SlotsPanel search={searchParams} setParams={setParams} notify={notify} onMutate={overview.reload} />}
          {active === 'reviews' && <ReviewsPanel profile={profile.data} search={searchParams} setParams={setParams} />}
        </main>
      </div>
      {toast && <div className={`expert-toast ${toast.tone}`} role="status"><span>{toast.tone === 'success' ? '✓' : '!'}</span><p>{toast.message}</p><button type="button" aria-label="Đóng thông báo" onClick={() => setToast(null)}><X size={17} /></button></div>}
    </div>
  )
}

