import { ArrowDown, ArrowUp, Eye } from '@phosphor-icons/react'
import type { AdminUserListItem, AdminUserSortDirection, AdminUserSortField } from '../model/admin-users'
import { formatAdminUserEnum } from '../model/admin-users'
import { formatAdminDate, getInitials } from '../model/admin-formatters'
import { StatusBadge } from './AdminUI'

function SortButton({ label, field, activeField, direction, onSort }: {
  label: string
  field: AdminUserSortField
  activeField: AdminUserSortField
  direction: AdminUserSortDirection
  onSort: (field: AdminUserSortField) => void
}) {
  const active = field === activeField
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown
  return <button className="admin-sort-button" type="button" onClick={() => onSort(field)} aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}>{label}{active && <Icon size={12} weight="bold" />}</button>
}

export function AdminUsersTable({ users, sortBy, sortDirection, onSort, onView }: {
  users: AdminUserListItem[]
  sortBy: AdminUserSortField
  sortDirection: AdminUserSortDirection
  onSort: (field: AdminUserSortField) => void
  onView: (user: AdminUserListItem) => void
}) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-table admin-users-table">
        <thead><tr>
          <th><SortButton label="User" field="displayName" activeField={sortBy} direction={sortDirection} onSort={onSort} /></th>
          <th>Phone</th><th>Roles</th>
          <th><SortButton label="Status" field="status" activeField={sortBy} direction={sortDirection} onSort={onSort} /></th>
          <th><SortButton label="Joined" field="createdAt" activeField={sortBy} direction={sortDirection} onSort={onSort} /></th>
          <th><span className="sr-only">Actions</span></th>
        </tr></thead>
        <tbody>{users.map((user) => {
          const displayName = user.displayName?.trim() || 'Unnamed user'
          return <tr key={user.id}>
            <td><div className="admin-user-cell"><span className="admin-avatar small">{getInitials(displayName)}</span><div><strong>{displayName}</strong>{user.email && <span>{user.email}</span>}</div></div></td>
            <td><span className="admin-table-primary">{user.phone}</span></td>
            <td><div className="admin-user-badges">{user.roles.map((role) => <span className="admin-role-badge" key={role}>{formatAdminUserEnum(role)}</span>)}</div></td>
            <td><StatusBadge value={formatAdminUserEnum(user.status)} /></td>
            <td>{formatAdminDate(user.createdAt)}</td>
            <td><button className="admin-row-action" type="button" aria-label={`View details for ${displayName}`} title="View details" onClick={() => onView(user)}><Eye size={18} /></button></td>
          </tr>
        })}</tbody>
      </table>
    </div>
  )
}
