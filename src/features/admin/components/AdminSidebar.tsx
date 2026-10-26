import { BookOpenText, CalendarDots, ChartBar, ChatsCircle, ChatTeardropText, Headset, SquaresFour, UsersThree, Stethoscope, Wallet, Bell, SidebarSimple, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ScrollArea } from '@/components/ui/scroll-area'
import { focusTargetForTab, getFocusableElements, restoreDialogFocus } from '@/shared/model/dialog-focus'
import { adminNavigationGroups } from '../model/admin-navigation'
const icons = { overview: SquaresFour, users: UsersThree, experts: Stethoscope, appointments: CalendarDots, consultations: ChatsCircle, support: Headset, community: ChatTeardropText, knowledge: BookOpenText, revenue: Wallet, reports: ChartBar, notifications: Bell }

export function AdminSidebar({ open,onClose,collapsed,onToggleCollapse }: { open:boolean; onClose:() => void; collapsed:boolean; onToggleCollapse:() => void }) {
  const [preview, setPreview] = useState(false)
  const aside = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => aside.current?.querySelector<HTMLButtonElement>('.admin-sidebar-close')?.focus())
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current() }
      if (e.key === 'Tab' && aside.current) {
        const focusable = getFocusableElements(aside.current).filter((element) => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
        const target = aside.current.contains(document.activeElement) ? focusTargetForTab(focusable,document.activeElement,e.shiftKey) : e.shiftKey ? focusable.at(-1) : focusable[0]
        if (target) { e.preventDefault(); target.focus() }
      }
    }
    const resize = () => { if (window.innerWidth > 1020) onCloseRef.current() }
    document.addEventListener('keydown',key); window.addEventListener('resize',resize)
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previous; document.removeEventListener('keydown',key); window.removeEventListener('resize',resize); restoreDialogFocus(opener) }
  },[open])
  return <><aside ref={aside} className={`admin-sidebar${open ? ' is-open' : ''}${collapsed ? ' is-collapsed' : ''}${collapsed && preview ? ' is-peek' : ''}`} aria-label="Điều hướng quản trị" role={open ? 'dialog' : undefined} aria-modal={open || undefined} id="admin-sidebar"
    onPointerEnter={(event) => { if (collapsed && event.pointerType === 'mouse') setPreview(true) }}
    onPointerLeave={() => setPreview(false)}
    onFocusCapture={() => { if (collapsed) setPreview(true) }}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPreview(false) }}>
    <div className="admin-brand"><img src="/nutrimom-logo.png" width="42" height="42" alt="" /><div><strong>NutriMom</strong><span>Không gian quản trị</span></div><button className="admin-sidebar-close" type="button" onClick={onClose} aria-label="Đóng điều hướng"><X size={20} /></button></div>
    <button type="button" className="admin-sidebar-toggle" aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'} aria-expanded={!collapsed || preview} aria-controls="admin-sidebar-navigation" onClick={() => { onToggleCollapse(); setPreview(false) }}><SidebarSimple size={20} aria-hidden /><span>{collapsed ? 'Giữ mở thanh điều hướng' : 'Thu gọn điều hướng'}</span></button>
    <ScrollArea className="admin-sidebar-scroll"><nav className="admin-nav" id="admin-sidebar-navigation">{adminNavigationGroups.map((group, groupIndex) => <section className="admin-nav-group" key={group.label} aria-label={group.label}><h2 className="admin-nav-label">{group.label}</h2>{group.items.map((item, index) => { const Icon = icons[item.icon]; return <NavLink key={item.to} to={item.to} end={'end' in item && item.end} aria-label={item.label} onClick={() => { setPreview(false); onClose() }} style={{ '--admin-menu-index':groupIndex * 2 + index } as React.CSSProperties} className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}><Icon size={20} weight="duotone" aria-hidden /><span>{item.label}</span></NavLink> })}</section>)}</nav></ScrollArea>
    <p className="admin-sidebar-footer">NutriMom · Quản trị</p>
  </aside>{open && <button className="admin-sidebar-backdrop" type="button" onClick={onClose} aria-label="Đóng điều hướng" tabIndex={-1} />}</>
}
