import { ArrowClockwise, ArrowLeft, ArrowRight, MagnifyingGlass, Plus, SlidersHorizontal, Stethoscope, Tray, UsersThree, UserCheck, UserPlus } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi, adminExpertsApi } from '../api/admin-api'
import { AdminExpertCreateDialog } from '../components/AdminExpertCreateDialog'
import { AdminExpertDetailDrawer } from '../components/AdminExpertDetailDrawer'
import { AdminExpertsTable } from '../components/AdminExpertsTable'
import { AdminFilterSelect } from '../components/AdminFilterSelect'
import { AdminUserDetailDrawer } from '../components/AdminUserDetailDrawer'
import { AdminUsersChart } from '../components/AdminUsersChart'
import { AdminUsersTable } from '../components/AdminUsersTable'
import { PageHeading } from '../components/AdminUI'
import { expertSpecialties } from '../model/admin-experts'
import type { AdminExpert, ExpertSpecialtyOption } from '../model/admin-experts'
import { adminOnboardingStatuses, adminUserPageSizes, adminUserRoles, adminUserStatuses, formatAdminUserEnum, readAdminUsersQuery } from '../model/admin-users'
import type { AdminUserListItem, AdminUsersPage, AdminUsersSummary, AdminUserSortField } from '../model/admin-users'

type RequestState = 'loading' | 'success' | 'error'
type Section = 'users' | 'experts'
const emptyPage: AdminUsersPage = { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
const numberFormatter = new Intl.NumberFormat()
const fallbackSpecialties: ExpertSpecialtyOption[] = expertSpecialties.map((code, index) => ({ code, displayName: formatAdminUserEnum(code), sortOrder: index + 1 }))

function errorMessage(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback }
function SummarySkeleton() { return <div className="admin-users-overview" aria-label="Loading user overview"><div className="admin-summary-strip admin-users-summary-skeleton"><span /><span /><span /><span /></div></div> }
function SummaryError({ message, onRetry }: { message: string | null; onRetry: () => void }) { return <section className="admin-card admin-users-summary-error" role="alert"><span className="admin-state-icon error"><ArrowClockwise size={24} /></span><div><h2>User overview is unavailable</h2><p>{message}</p></div><button className="admin-button secondary" type="button" onClick={onRetry}><ArrowClockwise size={17} />Try again</button></section> }
function UserOverview({ summary }: { summary: AdminUsersSummary }) { return <div className="admin-users-overview"><section className="admin-summary-strip admin-users-summary" aria-label="User overview"><div><span className="admin-summary-icon"><UsersThree size={19} weight="duotone" /></span><strong>{numberFormatter.format(summary.totalUsers)}</strong><span>Total users</span></div><div><span className="admin-summary-icon positive"><UserCheck size={19} weight="duotone" /></span><strong>{numberFormatter.format(summary.activeUsers)}</strong><span>Active users</span></div><div><span className="admin-summary-icon"><UserPlus size={19} weight="duotone" /></span><strong>{numberFormatter.format(summary.newUsersThisMonth)}</strong><span>New this month {summary.currentPeriod.label}</span></div><AdminUsersChart summary={summary} /></section></div> }

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const section: Section = searchParams.get('section') === 'experts' ? 'experts' : 'users'
  const userQuerySearch = useMemo(() => {
    const userParams = new URLSearchParams()
    for (const key of ['page', 'pageSize', 'q', 'status', 'role', 'onboardingStatus', 'sortBy', 'sortDirection']) {
      const value = searchParams.get(key)
      if (value) userParams.set(key, value)
    }
    return userParams.toString()
  }, [searchParams])
  const query = useMemo(() => readAdminUsersQuery(userQuerySearch), [userQuerySearch])
  const [searchInput, setSearchInput] = useState(query.q ?? '')
  const [page, setPage] = useState<AdminUsersPage>(emptyPage)
  const [listState, setListState] = useState<RequestState>('loading')
  const [listError, setListError] = useState<string | null>(null)
  const [listReload, setListReload] = useState(0)
  const [summary, setSummary] = useState<AdminUsersSummary | null>(null)
  const [summaryState, setSummaryState] = useState<RequestState>('loading')
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summaryReload, setSummaryReload] = useState(0)
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null)
  const [openFilter, setOpenFilter] = useState<'status' | 'role' | 'onboarding' | null>(null)
  const [experts, setExperts] = useState<AdminExpert[]>([])
  const [expertsState, setExpertsState] = useState<RequestState>('loading')
  const [expertsError, setExpertsError] = useState<string | null>(null)
  const [expertsReload, setExpertsReload] = useState(0)
  const [selectedExpert, setSelectedExpert] = useState<AdminExpert | null>(null)
  const [createExpertOpen, setCreateExpertOpen] = useState(false)
  const [specialties, setSpecialties] = useState<ExpertSpecialtyOption[]>(fallbackSpecialties)
  const [specialtiesState, setSpecialtiesState] = useState<RequestState>('loading')
  const [specialtiesError, setSpecialtiesError] = useState<string | null>(null)
  const [specialtiesReload, setSpecialtiesReload] = useState(0)
  const [feedback, setFeedback] = useState('')

  const setParameter = useCallback((name: string, nextValue: string) => { setSearchParams((current) => { const next = new URLSearchParams(current); if (nextValue) next.set(name, nextValue); else next.delete(name); if (name !== 'page') next.delete('page'); return next }, { replace: true }) }, [setSearchParams])
  const setSection = useCallback((nextSection: Section) => { setSearchParams((current) => { const next = new URLSearchParams(current); if (nextSection === 'users') next.delete('section'); else next.set('section', 'experts'); return next }) }, [setSearchParams])

  useEffect(() => setSearchInput(query.q ?? ''), [query.q])
  useEffect(() => { const normalized = searchInput.trim(); if (normalized === (query.q ?? '')) return; const timeout = window.setTimeout(() => setParameter('q', normalized), 400); return () => window.clearTimeout(timeout) }, [query.q, searchInput, setParameter])
  useEffect(() => { const controller = new AbortController(); setListState('loading'); setListError(null); adminApi.getAdminUsers(query, controller.signal).then((result) => { if (controller.signal.aborted) return; setPage(result); setListState('success'); if (query.page > Math.max(1, result.totalPages)) setParameter('page', result.totalPages > 1 ? String(result.totalPages) : '') }).catch((reason: unknown) => { if (controller.signal.aborted) return; setListError(errorMessage(reason, 'Unable to load users.')); setListState('error') }); return () => controller.abort() }, [listReload, query, setParameter])
  useEffect(() => { const controller = new AbortController(); setSummaryState('loading'); setSummaryError(null); adminApi.getAdminUsersSummary(controller.signal).then((result) => { if (controller.signal.aborted) return; setSummary(result); setSummaryState('success') }).catch((reason: unknown) => { if (controller.signal.aborted) return; setSummaryError(errorMessage(reason, 'Unable to load the user overview.')); setSummaryState('error') }); return () => controller.abort() }, [summaryReload])
  useEffect(() => { const controller = new AbortController(); setSpecialtiesState('loading'); adminExpertsApi.specialties(controller.signal).then((result) => { if (controller.signal.aborted) return; setSpecialties(result); setSpecialtiesError(null); setSpecialtiesState('success') }).catch((reason: unknown) => { if (controller.signal.aborted) return; setSpecialties(fallbackSpecialties); setSpecialtiesError(errorMessage(reason, 'Specialty labels are temporarily unavailable; verified specialty codes are shown.')); setSpecialtiesState('error') }); return () => controller.abort() }, [specialtiesReload])
  useEffect(() => { if (section !== 'experts') return; const controller = new AbortController(); setExpertsState('loading'); setExpertsError(null); adminExpertsApi.list(controller.signal).then((result) => { if (controller.signal.aborted) return; setExperts(result); setExpertsState('success') }).catch((reason: unknown) => { if (controller.signal.aborted) return; setExpertsError(errorMessage(reason, 'Unable to load experts.')); setExpertsState('error') }); return () => controller.abort() }, [expertsReload, section])

  const upsertExpert = useCallback((updated: AdminExpert) => { setExperts((current) => current.some((item) => item.userId === updated.userId) ? current.map((item) => item.userId === updated.userId ? updated : item) : [updated, ...current]); setSelectedExpert((current) => current?.userId === updated.userId ? updated : current) }, [])
  const expertCreated = useCallback((updated: AdminExpert) => { upsertExpert(updated); setFeedback('Expert created successfully.') }, [upsertExpert])
  useEffect(() => { if (!feedback) return; const timeout = window.setTimeout(() => setFeedback(''), 4200); return () => window.clearTimeout(timeout) }, [feedback])
  function resetFilters() { setSearchInput(''); setSearchParams((current) => { const next = new URLSearchParams(current); for (const name of ['page', 'q', 'status', 'role', 'onboardingStatus', 'sortBy', 'sortDirection']) next.delete(name); return next }, { replace: true }) }
  function sort(field: AdminUserSortField) { const direction = query.sortBy === field ? (query.sortDirection === 'asc' ? 'desc' : 'asc') : (field === 'createdAt' || field === 'updatedAt' ? 'desc' : 'asc'); setSearchParams((current) => { const next = new URLSearchParams(current); next.set('sortBy', field); next.set('sortDirection', direction); next.delete('page'); return next }, { replace: true }) }
  const hasFilters = Boolean(query.q || query.status || query.role || query.onboardingStatus)
  const firstShown = page.totalItems === 0 ? 0 : (page.page - 1) * page.pageSize + 1
  const lastShown = Math.min(page.page * page.pageSize, page.totalItems)

  return <div className="admin-page admin-users-page">
    <PageHeading title="User Management" description="Manage registered users and expert accounts" actions={<button className="admin-button primary" type="button" onClick={() => setCreateExpertOpen(true)}><Plus size={18} />Create expert</button>} />
    {feedback && <div className="admin-page-feedback" role="status">{feedback}</div>}
    {summaryState === 'loading' && !summary && <SummarySkeleton />}{summaryState === 'error' && <SummaryError message={summaryError} onRetry={() => setSummaryReload((current) => current + 1)} />}{summaryState !== 'error' && summary && <UserOverview summary={summary} />}
    <nav className="admin-management-tabs" aria-label="Account type"><button type="button" data-active={section === 'users'} aria-current={section === 'users' ? 'page' : undefined} onClick={() => setSection('users')}><UsersThree size={17} />Users</button><button type="button" data-active={section === 'experts'} aria-current={section === 'experts' ? 'page' : undefined} onClick={() => setSection('experts')}><Stethoscope size={17} />Experts</button></nav>

    {section === 'users' && <section className="admin-card admin-users-list-card">
      <header className="admin-card-heading admin-users-list-heading"><div><h2>All users</h2><p>{listState === 'success' ? `${numberFormatter.format(page.totalItems)} registered accounts` : 'Synced with the account service'}</p></div>{listState === 'loading' && page.items.length > 0 && <span className="admin-users-refreshing">Updating…</span>}</header>
      <div className="admin-users-toolbar" aria-label="Search and filter users"><label className="admin-users-search"><MagnifyingGlass size={17} /><span className="sr-only">Search users</span><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by name, phone or email" /></label><AdminFilterSelect label="Status" placeholder="All statuses" options={adminUserStatuses.map((status) => ({ value: status, label: formatAdminUserEnum(status) }))} value={query.status ?? ''} open={openFilter === 'status'} onOpenChange={(open) => setOpenFilter(open ? 'status' : null)} onChange={(value) => setParameter('status', value)} /><AdminFilterSelect label="Role" placeholder="All roles" options={adminUserRoles.map((role) => ({ value: role, label: formatAdminUserEnum(role) }))} value={query.role ?? ''} open={openFilter === 'role'} onOpenChange={(open) => setOpenFilter(open ? 'role' : null)} onChange={(value) => setParameter('role', value)} /><AdminFilterSelect label="Onboarding" placeholder="All onboarding" options={adminOnboardingStatuses.map((value) => ({ value, label: formatAdminUserEnum(value) }))} value={query.onboardingStatus ?? ''} open={openFilter === 'onboarding'} onOpenChange={(open) => setOpenFilter(open ? 'onboarding' : null)} onChange={(value) => setParameter('onboardingStatus', value)} />{hasFilters && <button className="admin-button compact secondary" type="button" onClick={resetFilters}><SlidersHorizontal size={16} />Reset</button>}</div>
      {listState === 'loading' && page.items.length === 0 && <div className="admin-users-table-skeleton" aria-label="Loading users"><span /><span /><span /><span /><span /></div>}{listState === 'error' && <div className="admin-state" role="alert"><span className="admin-state-icon error"><ArrowClockwise size={24} /></span><h3>Could not load users</h3><p>{listError}</p><button className="admin-button secondary" type="button" onClick={() => setListReload((current) => current + 1)}><ArrowClockwise size={17} />Try again</button></div>}{listState !== 'error' && page.items.length > 0 && <AdminUsersTable users={page.items} sortBy={query.sortBy} sortDirection={query.sortDirection} onSort={sort} onView={setSelectedUser} />}{listState === 'success' && page.items.length === 0 && <div className="admin-state"><span className="admin-state-icon"><Tray size={25} /></span><h3>No users found</h3><p>{hasFilters ? 'No users match your current filters.' : 'Registered accounts will appear here.'}</p>{hasFilters && <button className="admin-button secondary" type="button" onClick={resetFilters}>Clear filters</button>}</div>}
      {listState !== 'error' && page.totalItems > 0 && <footer className="admin-users-pagination"><span>Showing {numberFormatter.format(firstShown)}–{numberFormatter.format(lastShown)} of {numberFormatter.format(page.totalItems)} users</span><label>Rows <select value={query.pageSize} onChange={(event) => setParameter('pageSize', event.target.value)}>{adminUserPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label><nav aria-label="User list pagination"><button type="button" disabled={listState === 'loading' || page.page <= 1} onClick={() => setParameter('page', page.page - 1 > 1 ? String(page.page - 1) : '')}><ArrowLeft size={16} />Previous</button><span>Page {page.page} of {Math.max(1, page.totalPages)}</span><button type="button" disabled={listState === 'loading' || page.page >= page.totalPages} onClick={() => setParameter('page', String(page.page + 1))}>Next<ArrowRight size={16} /></button></nav></footer>}
    </section>}

    {section === 'experts' && <section className="admin-card admin-users-list-card admin-experts-list-card"><header className="admin-card-heading admin-users-list-heading"><div><h2>All experts</h2><p>{expertsState === 'success' ? `${numberFormatter.format(experts.length)} expert profiles` : 'Synced with the expert service'}</p></div>{expertsState === 'loading' && experts.length > 0 && <span className="admin-users-refreshing">Updating…</span>}</header>{specialtiesState === 'loading' && <div className="admin-reference-notice" role="status">Loading specialty labels…</div>}{specialtiesState === 'error' && <div className="admin-reference-notice" role="status"><span>{specialtiesError}</span><button type="button" onClick={() => setSpecialtiesReload((current) => current + 1)}><ArrowClockwise size={14} />Retry</button></div>}{expertsState === 'loading' && experts.length === 0 && <div className="admin-users-table-skeleton" aria-label="Loading experts"><span /><span /><span /><span /><span /></div>}{expertsState === 'error' && <div className="admin-state" role="alert"><span className="admin-state-icon error"><ArrowClockwise size={24} /></span><h3>Could not load experts</h3><p>{expertsError}</p><button className="admin-button secondary" type="button" onClick={() => setExpertsReload((current) => current + 1)}><ArrowClockwise size={17} />Try again</button></div>}{expertsState !== 'error' && experts.length > 0 && <AdminExpertsTable experts={experts} specialties={specialties} onView={setSelectedExpert} />}{expertsState === 'success' && experts.length === 0 && <div className="admin-state"><span className="admin-state-icon"><Stethoscope size={25} /></span><h3>No experts found</h3><p>Create the first expert account and professional profile.</p><button className="admin-button primary" type="button" onClick={() => setCreateExpertOpen(true)}><Plus size={17} />Create expert</button></div>}</section>}
    {selectedUser && <AdminUserDetailDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />}{selectedExpert && <AdminExpertDetailDrawer expert={selectedExpert} specialties={specialties} onChanged={upsertExpert} onClose={() => setSelectedExpert(null)} />}{createExpertOpen && <AdminExpertCreateDialog specialties={specialties} specialtyNotice={specialtiesState === 'loading' ? 'Loading specialty labels…' : specialtiesError} onCreated={expertCreated} onClose={() => setCreateExpertOpen(false)} />}
  </div>
}
