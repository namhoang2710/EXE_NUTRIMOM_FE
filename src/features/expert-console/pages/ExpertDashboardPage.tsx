import { CalendarBlank, CalendarDots, ChartPieSlice, FirstAidKit, List, SignOut, Star, UsersThree, X } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { expertConsoleApi } from '../api/expert-console-api'
import { OverviewPanel } from '../components/OverviewPanel'
import { RequestsPanel } from '../components/RequestsPanel'
import { ReviewsPanel } from '../components/ReviewsPanel'
import { ExpertProfileDialog } from '../components/ExpertProfileDialog'
import { SchedulePanel } from '../components/SchedulePanel'
import { WorkSchedulePanel } from '../components/WorkSchedulePanel'
import { useExpertResource } from '../hooks/useExpertResource'
import { specialtyLabels } from '../model/expert-console-types'
import { ExpertToast, type ExpertToastState } from '../components/ExpertUI'
import '../styles/expert-console.css'

const sections = ['overview', 'schedule', 'requests', 'slots', 'reviews'] as const
type Section = (typeof sections)[number]

const navigation = [
  { id: 'overview' as const, label: 'Tổng quan', icon: ChartPieSlice },
  { id: 'schedule' as const, label: 'Lịch tư vấn', icon: CalendarBlank },
  { id: 'requests' as const, label: 'Yêu cầu tư vấn', icon: UsersThree },
  { id: 'slots' as const, label: 'Lịch làm việc', icon: CalendarDots },
  { id: 'reviews' as const, label: 'Đánh giá', icon: Star },
]

export function ExpertDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const active = sections.includes(searchParams.get('section') as Section) ? searchParams.get('section') as Section : 'overview'
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<ExpertToastState | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const lastFocusRefresh = useRef(Date.now())
  const toastId = useRef(0)
  const reduceMotion = useReducedMotion()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const profile = useExpertResource((signal) => expertConsoleApi.profile(signal), [])
  const overview = useExpertResource((signal) => expertConsoleApi.overview(signal), [])
  const profileReloadRef = useRef(profile.reload)
  const overviewReloadRef = useRef(overview.reload)
  profileReloadRef.current = profile.reload
  overviewReloadRef.current = overview.reload

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastFocusRefresh.current < 10_000) return
      lastFocusRefresh.current = Date.now()
      setRefreshToken((value) => value + 1)
      void Promise.allSettled([profileReloadRef.current(), overviewReloadRef.current()])
    }
    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)
    return () => {
      window.removeEventListener('focus', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [])

  const setParams = useCallback((values: Record<string, string | undefined>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setSection = useCallback((section: string, values: Record<string, string | undefined> = {}) => {
    setParams({ section: section === 'overview' ? undefined : section, ...values })
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [reduceMotion, setParams])

  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    toastId.current += 1
    setToast({ id: toastId.current, message, tone })
  }, [])
  const reloadOverview = useCallback(async () => { await overviewReloadRef.current() }, [])
  const initials = useMemo(() => profile.data?.fullName.split(/\s+/).slice(-2).map((word) => word[0]).join('').toUpperCase() || 'NM', [profile.data])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function openProfile() {
    setProfileOpen(true)
    void profile.reload()
  }

  return (
    <div className="expert-shell">
      <aside className={`expert-sidebar${menuOpen ? ' is-open' : ''}`}>
        <div className="expert-brand"><img src="/nutrimom-logo.png" alt="" width="38" height="38" /><div><strong>NutriMom</strong><span>Expert Console</span></div><button type="button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
        <nav aria-label="Điều hướng Expert Console">{navigation.map((item) => { const Icon = item.icon; const count = item.id === 'requests' ? overview.data?.upcomingConsultations : undefined; return <button type="button" key={item.id} className={active === item.id ? 'is-active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => setSection(item.id)}><Icon size={20} weight={active === item.id ? 'fill' : 'regular'} /><span className="expert-nav-label">{item.label}</span>{count !== undefined && <span className="expert-nav-count" aria-label={`${count} yêu cầu đã được giao`}>{count}</span>}</button> })}</nav>
        <div className="expert-sidebar-profile" role="button" tabIndex={0} aria-haspopup="dialog" aria-label="Xem hồ sơ cá nhân" onClick={openProfile} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openProfile() } }}><span className="expert-avatar small">{profile.data?.avatarUrl ? <img src={profile.data.avatarUrl} alt="" /> : initials}</span><div><strong>{profile.data?.fullName || 'Chuyên gia NutriMom'}</strong><small>{profile.data ? specialtyLabels[profile.data.specialty] : 'Đang tải hồ sơ'}</small></div></div>
      </aside>
      {menuOpen && <button className="expert-sidebar-backdrop" type="button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <div className="expert-workspace">
        <header className="expert-topbar"><button className="expert-menu-button" type="button" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><List size={22} /></button><div className="expert-topbar-context"><FirstAidKit size={20} weight="duotone" /><span>Không gian làm việc chuyên gia</span></div><div className="expert-topbar-actions"><ThemeToggle /><button className="expert-logout" type="button" onClick={() => void handleLogout()}><SignOut size={18} /><span>Đăng xuất</span></button></div></header>
        <main className="expert-content">
          {profile.error && <div className="expert-profile-error" role="alert">Không thể tải hồ sơ chuyên gia. <button type="button" onClick={() => void profile.reload()}>Thử lại</button></div>}
          <motion.div
            key={active}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            {active === 'overview' && <OverviewPanel profile={profile.data} overview={overview.data} loading={overview.loading} error={overview.error} retry={overview.reload} onNavigate={setSection} refreshToken={refreshToken} />}
            {active === 'schedule' && <SchedulePanel search={searchParams} setParams={setParams} notify={notify} onMutate={reloadOverview} refreshToken={refreshToken} />}
            {active === 'requests' && <RequestsPanel search={searchParams} setParams={setParams} notify={notify} onMutate={reloadOverview} refreshToken={refreshToken} assignedTotal={overview.data?.upcomingConsultations ?? 0} poolTotal={overview.data?.pendingRequests ?? 0} />}
            {active === 'slots' && <WorkSchedulePanel search={searchParams} setParams={setParams} notify={notify} onMutate={reloadOverview} refreshToken={refreshToken} />}
            {active === 'reviews' && <ReviewsPanel profile={profile.data} search={searchParams} setParams={setParams} refreshToken={refreshToken} />}
          </motion.div>
        </main>
      </div>
      <ExpertToast toast={toast} onClose={() => setToast(null)} />
      <ExpertProfileDialog open={profileOpen} profile={profile.data} loading={profile.loading} error={profile.error} onClose={() => setProfileOpen(false)} onRetry={() => void profile.reload()} />
    </div>
  )
}

