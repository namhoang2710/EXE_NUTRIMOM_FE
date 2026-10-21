import { BookOpenText, CalendarDots, ChartBar, ChatsCircle, ChatTeardropText, Headset, SquaresFour, UsersThree, Stethoscope, Wallet, Bell, X } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { focusTargetForTab, getFocusableElements, restoreDialogFocus } from '@/shared/model/dialog-focus'
const navigation = [
  { label:'Tổng quan',to:'/admin',end:true,icon:SquaresFour },
  { label:'Người dùng',to:'/admin/users',icon:UsersThree },
  { label:'Chuyên gia',to:'/admin/experts',icon:Stethoscope },
  { label:'Lịch tư vấn',to:'/admin/appointments',icon:CalendarDots },
  { label:'Lịch sử tư vấn',to:'/admin/consultations',icon:ChatsCircle },
  { label:'Hỗ trợ',to:'/admin/support',icon:Headset },
  { label:'Kiến thức',to:'/admin/knowledge',icon:BookOpenText },
  { label:'Cộng đồng',to:'/admin/community',icon:ChatTeardropText },
  { label:'Doanh thu & Gói dịch vụ',to:'/admin/revenue',icon:Wallet },
  { label:'Báo cáo',to:'/admin/reports',icon:ChartBar },
  { label:'Thông báo',to:'/admin/notifications',icon:Bell },
]
export function AdminSidebar({ open,onClose }: { open:boolean; onClose:() => void }) {
  const aside = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'
    aside.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current() }
      if (e.key === 'Tab' && aside.current) { const target = focusTargetForTab(getFocusableElements(aside.current),document.activeElement,e.shiftKey); if (target) { e.preventDefault(); target.focus() } }
    }
    const resize = () => { if (window.innerWidth > 1020) onCloseRef.current() }
    document.addEventListener('keydown',key); window.addEventListener('resize',resize)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown',key); window.removeEventListener('resize',resize); restoreDialogFocus(opener) }
  },[open])
  return <><aside ref={aside} className={`admin-sidebar${open ? ' is-open' : ''}`} aria-label="Điều hướng quản trị" role={open ? 'dialog' : undefined} aria-modal={open || undefined} id="admin-sidebar">
    <div className="admin-brand"><img src="/nutrimom-logo.png" width="42" height="42" alt="" /><div><strong>NutriMom</strong><span>Không gian quản trị</span></div><button className="admin-sidebar-close" type="button" onClick={onClose} aria-label="Đóng điều hướng"><X size={20} /></button></div>
    <nav className="admin-nav"><p className="admin-nav-label">Vận hành</p>{navigation.map(({ label,to,end,icon:Icon },index) => <NavLink key={to} to={to} end={end} onClick={onClose} style={{ '--admin-menu-index':index } as React.CSSProperties} className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}><Icon size={20} weight="duotone" aria-hidden /><span>{label}</span></NavLink>)}</nav>
    <p className="admin-sidebar-footer">NutriMom · Quản trị</p>
  </aside>{open && <button className="admin-sidebar-backdrop" type="button" onClick={onClose} aria-label="Đóng điều hướng" tabIndex={-1} />}</>
}
