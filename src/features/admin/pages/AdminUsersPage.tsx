import { DownloadSimple, Funnel, UserPlus } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '../api/admin-api'
import { UsersTable } from '../components/AdminTables'
import { PageHeading, ResourceState, TableCard } from '../components/AdminUI'
import { useAdminResource } from '../hooks/useAdminResource'

export function AdminUsersPage() {
  const resource = useAdminResource(adminApi.getUsers)
  const [searchParams] = useSearchParams()
  const query = searchParams.get('search')?.trim().toLowerCase() || ''
  const users = useMemo(() => resource.data?.filter((user) =>
    !query || [user.displayName, user.email, user.phone, user.id].some((value) => value.toLowerCase().includes(query)),
  ) ?? [], [query, resource.data])

  return (
    <div className="admin-page">
      <PageHeading title="Users" description="Manage members, specialists, roles and account access." actions={<><button className="admin-button secondary" type="button"><DownloadSimple size={18} />Export</button><button className="admin-button primary" type="button"><UserPlus size={18} />Add user</button></>} />
      <div className="admin-summary-strip"><div><strong>12,846</strong><span>Total users</span></div><div><strong>11,920</strong><span>Active</span></div><div><strong>782</strong><span>New this month</span></div><div><strong>144</strong><span>Specialists</span></div></div>
      <TableCard title={query ? `Search results for “${query}”` : 'All users'} description={`${users.length} records shown`} action={<button className="admin-button compact secondary" type="button"><Funnel size={17} />Filter</button>}>
        <ResourceState status={resource.status} empty={users.length === 0} error={resource.error} onRetry={resource.retry}><UsersTable users={users} /></ResourceState>
      </TableCard>
    </div>
  )
}
