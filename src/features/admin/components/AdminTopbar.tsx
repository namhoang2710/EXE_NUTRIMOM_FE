import { CaretDown, List, SignOut } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AdminGreeting } from './AdminGreeting'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { NotificationBellView } from '@/features/notifications/components/NotificationBell'
import { useAdminNotificationFeed } from '../hooks/useAdminNotifications'
import { adaptAdminNotificationLink } from '../model/admin-notification-link'
import { adminNotificationIcon, adminNotificationLabel } from './AdminNotificationCategory'
import { dateTime } from '../model/admin-workspace-formatters'
export function AdminTopbar({ onMenuOpen,bellOpen,setBellOpen }: { onMenuOpen:() => void; bellOpen:boolean; setBellOpen:(value:boolean | ((current:boolean) => boolean)) => void }) {
  const { user,logout,status } = useAuth()
  const navigate = useNavigate()
  const [profileOpen,setProfileOpen] = useState(false)
  const [loggingOut,setLoggingOut] = useState(false)
  const reducedMotion = useReducedMotion()
  const profile = useRef<HTMLDivElement>(null)
  const profileTrigger = useRef<HTMLButtonElement>(null)
  const feed = useAdminNotificationFeed(true)
  useEffect(() => {
    if (!profileOpen) return
    const close = (e: PointerEvent) => { if (!profile.current?.contains(e.target as Node)) setProfileOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setProfileOpen(false); profileTrigger.current?.focus() } }
    document.addEventListener('pointerdown',close); document.addEventListener('keydown',key)
    return () => { document.removeEventListener('pointerdown',close); document.removeEventListener('keydown',key) }
  },[profileOpen])
  async function signOut() { if (loggingOut) return; setLoggingOut(true); try { await logout(); navigate('/login',{ replace:true }) } finally { setLoggingOut(false) } }
  return <header className="admin-topbar"><button className="admin-menu-button" type="button" onClick={onMenuOpen} aria-label="Mở điều hướng" aria-controls="admin-sidebar"><List size={22} /></button>
    <AdminGreeting />
    <div className="admin-topbar-actions"><ThemeToggle /><div><NotificationBellView loadOnOpen={false} open={bellOpen} setOpen={setBellOpen} allPath="/admin/notifications" itemLabel={adminNotificationLabel} itemIcon={adminNotificationIcon} formatTime={dateTime} authenticated={!feed.accessDenied && status === 'authenticated' && Boolean(user?.roles.includes('ADMIN'))} feed={feed} pending={feed.mutationPending} adaptLink={(link) => adaptAdminNotificationLink(link,status === 'authenticated' && Boolean(user?.roles.includes('ADMIN')))} />{feed.stale && <span className="admin-count-stale" role="status" title="Số thông báo chưa đọc chưa được cập nhật." aria-label="Số thông báo chưa đọc chưa được cập nhật.">!</span>}</div>
      <div className="admin-profile-wrap" ref={profile}><button className="admin-profile-button" ref={profileTrigger} type="button" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}><span className="admin-avatar">{user?.displayName?.trim().charAt(0).toUpperCase() || 'A'}</span><span className="admin-profile-copy"><strong>{user?.displayName || 'Quản trị viên'}</strong><small>Quản trị viên</small></span><CaretDown size={14} /></button><AnimatePresence initial={false}>{profileOpen && <motion.div className="admin-profile-menu" inert={!profileOpen} initial={reducedMotion ? false : { height:0, opacity:0, y:-6 }} animate={{ height:'auto', opacity:1, y:0 }} exit={{ height:0, opacity:0, y:reducedMotion ? 0 : -6 }} transition={{ duration:reducedMotion ? 0 : .24, ease:[.22,1,.36,1] }}><div><strong>{user?.displayName}</strong><span>{user?.phone}</span></div><button type="button" onClick={() => void signOut()} disabled={loggingOut}><SignOut size={18} />{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></motion.div>}</AnimatePresence></div>
    </div>
  </header>
}
