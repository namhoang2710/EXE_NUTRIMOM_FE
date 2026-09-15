import {
  BookOpenText,
  CalendarDots,
  ChartBar,
  ChatsCircle,
  GearSix,
  Heartbeat,
  SquaresFour,
  UsersThree,
  X,
  BowlFood,
} from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'

const navigation = [
  { label: 'Dashboard', to: '/admin', end: true, icon: SquaresFour },
  { label: 'Users', to: '/admin/users', icon: UsersThree },
  { label: 'Appointments', to: '/admin/appointments', icon: CalendarDots },
  { label: 'Consultations', to: '/admin/consultations', icon: ChatsCircle },
  { label: 'Health', to: '/admin/health', icon: Heartbeat },
  { label: 'Nutrition', to: '/admin/nutrition', icon: BowlFood },
  { label: 'Knowledge', to: '/admin/knowledge', icon: BookOpenText },
  { label: 'Reports', to: '/admin/reports', icon: ChartBar },
  { label: 'Settings', to: '/admin/settings', icon: GearSix },
]

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  return (
    <>
      <aside className={`admin-sidebar${open ? ' is-open' : ''}`} aria-label="Admin navigation">
        <div className="admin-brand">
          <img src="/nutrimom-logo.png" width="42" height="42" alt="" />
          <div>
            <strong>NutriMom</strong>
            <span>Admin workspace</span>
          </div>
          <button className="admin-sidebar-close" type="button" onClick={onClose} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="admin-nav">
          <p className="admin-nav-label">Workspace</p>
          {navigation.map(({ label, to, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={20} weight="duotone" aria-hidden="true" />
              <span>{label}</span>
              {label === 'Health' && <span className="admin-nav-count">7</span>}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-status">
          <span className="admin-status-pulse" />
          <div>
            <strong>All systems operational</strong>
            <span>Last checked 2 min ago</span>
          </div>
        </div>
      </aside>
      {open && <button className="admin-sidebar-backdrop" type="button" onClick={onClose} aria-label="Close navigation" />}
    </>
  )
}
