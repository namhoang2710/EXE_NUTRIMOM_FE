import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getSessionScope } from '@/core/auth/token-store'
import { AdminSidebar } from '../components/AdminSidebar'
import { AdminTopbar } from '../components/AdminTopbar'
import { configureAdminReads, adminReads } from '../api/admin-read'
import { adminLoginAnimation, adminLoginAnimationDurationMs } from '../model/admin-login-animation'
import { AdminNotificationContext, useAdminNotificationOwner } from '../hooks/useAdminNotifications'
import { AdminLoginRevealContext } from '../hooks/admin-login-reveal-context'
import { parseAdminNotificationQuery } from '../model/admin-notifications'
import { useAdminRealtimeOwner } from '../hooks/useAdminRealtimeOwner'
import '../styles/admin.css'
import '../styles/admin-dashboard.css'
import '../styles/admin-sidebar.css'
import '@/features/notifications/styles/notifications.css'

export function AdminLayout() {
  const { status,user } = useAuth()
  configureAdminReads(user?.id || '',user?.roles || [],status === 'authenticated')
  const identity = `${getSessionScope()}:${user?.id}:${user?.roles.join(',')}`
  return <AdminWorkspace key={identity} />
}
function AdminWorkspace() {
  useAdminRealtimeOwner()
  const [sidebarOpen,setSidebarOpen] = useState(false)
  // Intentionally not persisted: every full reload starts at the original width.
  const [sidebarCollapsed,setSidebarCollapsed] = useState(false)
  const [bellOpen,setBellOpen] = useState(false)
  const [denied,setDenied] = useState(false)
  const location = useLocation()
  const onNotificationPage = location.pathname === '/admin/notifications'
  const notificationQuery = parseAdminNotificationQuery(new URLSearchParams(location.search))
  const feed = useAdminNotificationOwner(bellOpen,onNotificationPage && notificationQuery.valid ? notificationQuery.filter : null)
  const shell = useRef<HTMLDivElement>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [revealReady,setRevealReady]=useState(false)
  const seenReveals = useRef(new Set<string>())
  const revealContext = useMemo(() => ({ startedAt, seen: seenReveals.current,ready:revealReady }), [startedAt,revealReady])
  const animationRun = useRef<{ timer: number; subscribers: number } | null>(null)
  useLayoutEffect(() => {
    // Preserve the same run through StrictMode replay and remove it after completion,
    // so resizing from mobile to desktop cannot replay a media-query animation.
    if (!animationRun.current && adminLoginAnimation.consume(getSessionScope())) {
      shell.current?.classList.add('admin-login-enter')
      setStartedAt(performance.now())
      animationRun.current = { timer: window.setTimeout(() => shell.current?.classList.remove('admin-login-enter'),adminLoginAnimationDurationMs), subscribers: 0 }
    }
    const run = animationRun.current
    setRevealReady(true)
    if (run) run.subscribers++
    const forbidden = () => { adminReads.deny(); setDenied(true); setBellOpen(false); setSidebarOpen(false) }
    window.addEventListener('nutrimom:admin-denied',forbidden)
    return () => {
      window.removeEventListener('nutrimom:admin-denied',forbidden)
      if (run) { run.subscribers--; queueMicrotask(() => { if (!run.subscribers) window.clearTimeout(run.timer) }) }
    }
  },[])
  useEffect(() => { setSidebarOpen(false); setBellOpen(false) },[location.pathname])
  return <AdminLoginRevealContext.Provider value={revealContext}><AdminNotificationContext.Provider value={feed}><div className={`admin-shell${sidebarCollapsed ? ' has-collapsed-sidebar' : ''}`} ref={shell}>
    <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} />
    <div className="admin-main"><AdminTopbar onMenuOpen={() => setSidebarOpen(true)} bellOpen={bellOpen} setBellOpen={setBellOpen} />
      <main className="admin-content">{denied ? <section className="admin-card admin-state" role="alert"><h1>Bạn không đủ quyền truy cập Admin</h1><p>Dữ liệu của phiên đã được xóa. Vui lòng đăng nhập bằng tài khoản có quyền phù hợp.</p></section> : <Outlet />}</main>
    </div>
  </div></AdminNotificationContext.Provider></AdminLoginRevealContext.Provider>
}
