import { Navigate } from 'react-router-dom'
import { useAdminFilters } from '../hooks/useAdminFilters'
import { useAdminResource } from '../hooks/useAdminResource'
import { mapAdminUsersPage, mapAdminUsersSummary, type AdminUsersPageDto, type AdminUsersSummaryDto } from '../model/admin-users-mappers'
import { adminUserRoles, adminUserStatuses, adminOnboardingStatuses, readAdminUsersQuery, type AdminUserSortField } from '../model/admin-users'
import { AdminSelect, DataState, QueryErrors, SearchFilter, WorkspacePagination } from '../components/AdminWorkspaceUI'
import { AdminUsersChart } from '../components/AdminUsersChart'
import { AdminUsersTable } from '../components/AdminUsersTable'
import { AdminUserDetailDrawer } from '../components/AdminUserDetailDrawer'
import { parseWorkspaceQuery } from '../model/admin-workspace-query'
const mapUsers = (p: unknown) => mapAdminUsersPage(p as AdminUsersPageDto)
const mapSummary = (p: unknown) => mapAdminUsersSummary(p as AdminUsersSummaryDto)
export function AdminUsersPage() {
  const f = useAdminFilters('users')
  const redirect = f.params.get('section') === 'experts'
  const list = useAdminResource(f.valid && !redirect ? `/admin/users?${f.queryString}` : null, mapUsers)
  const summary = useAdminResource(!redirect ? '/admin/users/summary' : null, mapSummary)
  if (redirect) {
    const expertFilters = new URLSearchParams()
    for (const key of ['q','specialty','status','page','pageSize']) { const value = f.params.get(key); if (value) expertFilters.set(key,value) }
    const parsed = parseWorkspaceQuery(expertFilters,'experts')
    for (const key of Object.keys(parsed.errors)) expertFilters.delete(key)
    return <Navigate to={`/admin/experts?${expertFilters}`} replace />
  }
  const q = readAdminUsersQuery(f.query)
  const page = list.data ? { items:list.data.items, page:list.data.page, page_size:list.data.pageSize, total_items:list.data.totalItems, total_pages:list.data.totalPages } : null
  function sort(field: AdminUserSortField) { f.commit({ sortBy:field, sortDirection:q.sortBy === field && q.sortDirection === 'asc' ? 'desc' : 'asc' }) }
  return <div className="admin-page"><h1 className="sr-only">Người dùng</h1>
    <section className="admin-card"><DataState loading={summary.loading} error={summary.error} empty={!summary.data} retry={summary.retry}>{summary.data && <div className="admin-summary-strip admin-users-summary"><div><strong>{summary.data.totalUsers}</strong><span>Tổng người dùng</span></div><div><strong>{summary.data.activeUsers}</strong><span>Tài khoản hoạt động</span></div><div><strong>{summary.data.newUsersThisMonth}</strong><span>Mới trong tháng {summary.data.currentPeriod.label}</span></div><AdminUsersChart summary={summary.data} /></div>}</DataState></section>
    <section className="admin-card"><div className="admin-workspace-filters"><SearchFilter value={f.search} onChange={f.setSearch} /><AdminSelect label="Trạng thái" name="status" value={f.query.get('status') || ''} options={adminUserStatuses} onChange={(status) => f.commit({ status })} /><AdminSelect label="Vai trò" name="role" value={f.query.get('role') || ''} options={adminUserRoles} onChange={(role) => f.commit({ role })} /><AdminSelect label="Hồ sơ" name="onboardingStatus" value={f.query.get('onboardingStatus') || ''} options={adminOnboardingStatuses} onChange={(onboardingStatus) => f.commit({ onboardingStatus })} /></div>
    <QueryErrors errors={f.errors} onReset={() => f.commit(Object.fromEntries([...f.params.keys()].map((k) => [k,null])))} />
    {f.valid && <><DataState loading={list.loading} error={list.error} empty={!list.data?.items.length} retry={list.retry}><AdminUsersTable users={list.data?.items || []} sortBy={q.sortBy} sortDirection={q.sortDirection} onSort={sort} onView={(user) => f.commit({ userId:user.id },false)} /></DataState><WorkspacePagination data={page} page={f.page} pageSize={f.pageSize} busy={list.loading} commit={f.commit} /></>}
    </section>{f.valid && f.params.get('userId') && <AdminUserDetailDrawer key={f.params.get('userId')} userId={f.params.get('userId')!} onClose={() => f.commit({ userId:null },false)} />}
  </div>
}
