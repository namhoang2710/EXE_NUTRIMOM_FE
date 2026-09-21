import { Bell, CaretDown, List, MagnifyingGlass, SignOut } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ThemeToggle } from '@/shared/components/ThemeToggle'

interface AdminTopbarProps {
  onMenuOpen: () => void
}

export function AdminTopbar({ onMenuOpen }: AdminTopbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim()
    if (value) navigate(`/admin/users?search=${encodeURIComponent(value)}`)
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  const initial = user?.displayName.trim().charAt(0).toUpperCase() || 'A'

  return (
    <header className="admin-topbar">
      <button className="admin-menu-button" type="button" onClick={onMenuOpen} aria-label="Open navigation">
        <List size={22} />
      </button>

      <form className="admin-search" role="search" onSubmit={handleSearch}>
        <MagnifyingGlass size={19} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users, appointments, reports..."
          aria-label="Search admin workspace"
        />
        <kbd>⌘ K</kbd>
      </form>

      <div className="admin-topbar-actions">
        <ThemeToggle />
        <button className="admin-icon-button has-notification" type="button" aria-label="Notifications">
          <Bell size={20} />
          <span />
        </button>
        <div className="admin-profile-wrap">
          <button
            className="admin-profile-button"
            type="button"
            onClick={() => setProfileOpen((value) => !value)}
            aria-expanded={profileOpen}
          >
            <span className="admin-avatar">{initial}</span>
            <span className="admin-profile-copy">
              <strong>{user?.displayName || 'Administrator'}</strong>
              <small>Administrator</small>
            </span>
            <CaretDown size={14} />
          </button>
          {profileOpen && (
            <div className="admin-profile-menu">
              <div>
                <strong>{user?.displayName}</strong>
                <span>{user?.phone}</span>
              </div>
              <button type="button" onClick={() => void handleLogout()} disabled={loggingOut}>
                <SignOut size={18} />
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
