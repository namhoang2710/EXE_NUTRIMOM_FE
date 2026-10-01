import { ArrowClockwise, MagnifyingGlass, Tray, WarningCircle, X } from '@phosphor-icons/react'
import { Swirling } from '@/components/loading-ui/swirling'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '../api/admin-api'
import { AdminConsultationsTable } from '../components/AdminConsultationsTable'
import { PageHeading, TablePagination } from '../components/AdminUI'
import {
  adminConsultationPageSizes,
  readAdminConsultationsQuery,
  toAdminConsultationsSearchParams,
} from '../model/admin-consultations'
import type { AdminConsultationPage, AdminConsultationsQuery } from '../model/admin-consultations'

type RequestState = 'loading' | 'success' | 'error'

const emptyPage: AdminConsultationPage = {
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
  invalidItems: 0,
}

const numberFormatter = new Intl.NumberFormat('vi-VN')
const paginationLabels = {
  rows: 'Rows',
  previous: 'Previous',
  next: 'Next',
  nav: 'Completed consultation pagination',
  summary: (from: string, to: string, total: string, noun: string) => `Showing ${from}-${to} of ${total} ${noun}`,
  page: (current: number, last: number) => `Page ${current} of ${last}`,
}

function getErrorMessage(reason: unknown) {
  return reason instanceof Error && reason.message.trim()
    ? reason.message
    : 'Unable to load completed consultations.'
}

export function AdminConsultationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawSearch = searchParams.toString()
  const query = useMemo(() => readAdminConsultationsQuery(rawSearch), [rawSearch])
  const normalizedSearch = useMemo(() => toAdminConsultationsSearchParams(query).toString(), [query])
  const pageSizes = useMemo(() => Array.from(new Set([...adminConsultationPageSizes, query.pageSize])).sort((left, right) => left - right), [query.pageSize])
  const [searchInput, setSearchInput] = useState(query.q ?? '')
  const [page, setPage] = useState<AdminConsultationPage>(emptyPage)
  const [requestState, setRequestState] = useState<RequestState>('loading')
  const [requestError, setRequestError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const requestSequence = useRef(0)

  const updateQuery = useCallback((changes: Partial<AdminConsultationsQuery>) => {
    setSearchParams((current) => {
      const next = { ...readAdminConsultationsQuery(current), ...changes }
      return toAdminConsultationsSearchParams(next)
    }, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    if (rawSearch !== normalizedSearch) setSearchParams(new URLSearchParams(normalizedSearch), { replace: true })
  }, [normalizedSearch, rawSearch, setSearchParams])

  useEffect(() => setSearchInput(query.q ?? ''), [query.q])

  useEffect(() => {
    const normalized = searchInput.trim()
    if (normalized === (query.q ?? '')) return
    const timeout = window.setTimeout(() => updateQuery({ q: normalized || undefined, page: 1 }), 400)
    return () => window.clearTimeout(timeout)
  }, [query.q, searchInput, updateQuery])

  useEffect(() => {
    if (rawSearch !== normalizedSearch) return
    const controller = new AbortController()
    const sequence = ++requestSequence.current
    setRequestState('loading')
    setRequestError(null)

    adminApi.getConsultations(query, controller.signal).then((result) => {
      if (controller.signal.aborted || sequence !== requestSequence.current) return
      setPage(result)
      setRequestState('success')
      const lastPage = Math.max(1, result.totalPages)
      if (query.page > lastPage) updateQuery({ page: lastPage })
    }).catch((reason: unknown) => {
      if (controller.signal.aborted || sequence !== requestSequence.current) return
      setRequestError(getErrorMessage(reason))
      setRequestState('error')
    })

    return () => controller.abort()
  }, [normalizedSearch, query, rawSearch, reload, updateQuery])

  const clearSearch = useCallback(() => {
    setSearchInput('')
    updateQuery({ q: undefined, page: 1 })
  }, [updateQuery])

  const hasSearch = Boolean(query.q)
  const hasRows = page.items.length > 0
  const isSearchPending = searchInput.trim() !== (query.q ?? '')
  const isBusy = requestState === 'loading' || isSearchPending
  const emptyDataset = requestState === 'success' && !hasRows && page.totalItems === 0
  const emptyPageWithResults = requestState === 'success' && !hasRows && page.totalItems > 0

  return <div className="admin-page admin-consultations-page">
    <PageHeading title="Consultations" description="Review completed consultations and user feedback." />

    <section className="admin-card admin-consultations-list-card">
      <header className="admin-card-heading admin-consultations-heading">
        <div><h2>Completed consultations</h2><p>{requestState === 'success' ? `${numberFormatter.format(page.totalItems)} consultations in total` : 'Synced with the consultation service'}</p></div>
        <label className="admin-users-search">
          <MagnifyingGlass size={17} aria-hidden="true" />
          <span className="sr-only">Search consultations by user or expert name</span>
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search user or expert" autoComplete="off" />
          {searchInput && <button type="button" onClick={clearSearch} aria-label="Clear consultation search"><X size={15} aria-hidden="true" /></button>}
        </label>
      </header>

      {page.invalidItems > 0 && requestState !== 'error' && <div className="admin-consultations-data-warning" role="status"><WarningCircle size={17} aria-hidden="true" /><span>{page.invalidItems} {page.invalidItems === 1 ? 'record was' : 'records were'} excluded because the server returned invalid completed-consultation data.</span></div>}

      <div className={`admin-consultations-results${isBusy ? ' is-loading' : ''}`} aria-busy={isBusy}>
        <div className="admin-consultations-results-content">
          {requestState === 'error' && <div className="admin-state" role="alert"><span className="admin-state-icon error"><ArrowClockwise size={24} aria-hidden="true" /></span><h3>Could not load consultations</h3><p>{requestError}</p><button className="admin-button secondary" type="button" onClick={() => setReload((current) => current + 1)}><ArrowClockwise size={17} aria-hidden="true" />Retry</button></div>}

          {requestState !== 'error' && hasRows && <AdminConsultationsTable consultations={page.items} />}

          {emptyDataset && <div className="admin-state"><span className="admin-state-icon"><Tray size={25} aria-hidden="true" /></span><h3>{hasSearch ? 'No matching consultations' : 'No completed consultations yet'}</h3><p>{hasSearch ? 'No user or expert matches your search.' : 'Completed consultations will appear here when they become available.'}</p>{hasSearch && <button className="admin-button secondary" type="button" onClick={clearSearch}>Clear search</button>}</div>}

          {emptyPageWithResults && <div className="admin-state"><span className="admin-state-icon"><WarningCircle size={25} aria-hidden="true" /></span><h3>No valid consultations on this page</h3><p>The page contains records that could not be displayed safely.</p>{query.page > 1 && <button className="admin-button secondary" type="button" onClick={() => updateQuery({ page: query.page - 1 })}>Previous page</button>}</div>}
        </div>

        {isBusy && <div className="admin-consultations-loading" role="status" aria-live="polite">
          <Swirling className="admin-consultations-loading-icon" aria-hidden="true" />
          <span>{isSearchPending || hasSearch ? 'Đang tìm kiếm...' : 'Đang tải danh sách...'}</span>
        </div>}
      </div>

      {requestState !== 'error' && page.totalItems > 0 && <TablePagination
        page={query.page}
        pageSize={query.pageSize}
        totalItems={page.totalItems}
        totalPages={page.totalPages}
        pageSizes={pageSizes}
        busy={isBusy}
        itemNoun="consultations"
        labels={paginationLabels}
        onPageChange={(next) => updateQuery({ page: next })}
        onPageSizeChange={(next) => updateQuery({ pageSize: next, page: 1 })}
      />}
    </section>
  </div>
}
