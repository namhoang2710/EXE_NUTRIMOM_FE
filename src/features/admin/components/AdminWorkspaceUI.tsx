import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { adminLabel, dateRangeError, vietnamToday } from '../model/admin-workspace-query'
import { TablePagination } from './AdminUI'
import type { AdminPage } from '../model/admin-workspace-contract'
import { AdminDropdown } from './AdminDropdown'
import { AdminDatePicker } from './AdminDatePicker'
import { AdminRetryButton } from './AdminRetryButton'

export function QueryErrors({ errors, onReset }: { errors: Record<string, string>; onReset?: () => void }) {
  if (!Object.keys(errors).length) return null
  return <div className="admin-query-error" role="alert"><strong>Bộ lọc cần sửa</strong><ul>{Object.entries(errors).map(([key, error]) => <li key={key}>{key}: {error}</li>)}</ul>{onReset && <button type="button" className="admin-button secondary" onClick={onReset}>Đặt lại bộ lọc</button>}</div>
}
export function AdminSelect({ label, name, value, options, onChange, all = true, disabled = false }: { label: string; name: string; value: string; options: readonly string[]; onChange: (value: string) => void; all?: boolean; disabled?: boolean }) {
  return <AdminDropdown label={label} name={name} value={value} disabled={disabled} onChange={onChange} options={[...(all ? [{ value: '', label: 'Tất cả' }] : []), ...options.map((option) => ({ value: option, label: adminLabel(option) }))]} />
}
export function SearchFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId()
  const invalid = value.trim().length > 100
  return <label className="admin-filter-field admin-filter-search"><span>Tìm kiếm</span><input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Nhập tên hoặc mã…" aria-invalid={invalid} aria-describedby={invalid ? id : undefined} />{invalid && <small id={id}>Tìm kiếm tối đa 100 ký tự.</small>}</label>
}
export function PeriodFilter({ from, to, onChange, future = false, presets = false, actions }: { from: string; to: string; onChange: (from: string, to: string) => void; future?: boolean; presets?: boolean; actions?: ReactNode }) {
  const [draft, setDraft] = useState({ from, to })
  const [error, setError] = useState('')
  const errorId = useId()
  const firstDate = useRef<HTMLButtonElement>(null)
  useEffect(() => { setDraft({ from, to }); setError('') }, [from, to])
  const today = vietnamToday()
  function apply() { const reason = dateRangeError(draft.from, draft.to, future); setError(reason); if (!reason) onChange(draft.from, draft.to); else firstDate.current?.focus() }
  function preset(days: number) { const start = new Date(`${today}T00:00:00Z`); start.setUTCDate(start.getUTCDate() - days + 1); onChange(start.toISOString().slice(0, 10), today) }
  return <div className="admin-period-filter">
    {presets && <div className="admin-period-presets">{[1, 7, 30].map((days) => <button type="button" className="admin-button compact secondary" key={days} onClick={() => preset(days)}>{days === 1 ? 'Hôm nay' : `${days} ngày`}</button>)}<button type="button" className="admin-button compact secondary" onClick={() => onChange(`${today.slice(0, 7)}-01`, today)}>Tháng này</button></div>}
    <AdminDatePicker label="Từ ngày" buttonRef={firstDate} value={draft.from} future={future} invalid={Boolean(error)} describedBy={error ? errorId : undefined} onChange={(from) => setDraft((d) => ({ ...d, from }))} />
    <AdminDatePicker label="Đến ngày" value={draft.to} future={future} invalid={Boolean(error)} describedBy={error ? errorId : undefined} onChange={(to) => setDraft((d) => ({ ...d, to }))} />
    {actions ? <div className="admin-period-actions"><button type="button" className="admin-button secondary compact" onClick={apply}>Áp dụng</button>{actions}</div> : <button type="button" className="admin-button secondary compact" onClick={apply}>Áp dụng</button>}
    {error && <p id={errorId} className="admin-query-error" role="alert">{error}</p>}
  </div>
}
export function DataState({ loading, error, empty, retry, children }: { loading: boolean; error: string | null; empty: boolean; retry: () => void; children?: ReactNode }) {
  if (error) return <div className="admin-state" role="alert"><h3>Chưa thể tải dữ liệu</h3><p>{error}</p><AdminRetryButton retry={retry}/></div>
  if (loading && empty) return <div className="admin-loading" aria-label="Đang tải dữ liệu"><span /><span /><span /><span /></div>
  if (empty) return <div className="admin-state"><h3>Chưa có dữ liệu</h3><p>Không có bản ghi phù hợp với bộ lọc.</p></div>
  return <>{loading && <p role="status" className="admin-refresh-label">Đang cập nhật…</p>}{children}</>
}
export function WorkspacePagination<T>({ data, page, pageSize, busy, commit }: { data: AdminPage<T> | null; page: number; pageSize: number; busy: boolean; commit: (changes: Record<string, string | null>, resetPage?: boolean) => void }) {
  const corrected = useRef('')
  useEffect(() => {
    if (!data || busy) return
    const last = Math.max(1, data.total_pages)
    const key = `${page}:${last}`
    if (page > last && corrected.current !== key) { corrected.current = key; commit({ page: String(last) }, false) }
    else if (page <= last) corrected.current = ''
  }, [data, page, busy, commit])
  if (!data) return null
  return <TablePagination page={page} pageSize={pageSize} totalItems={data.total_items} totalPages={data.total_pages} pageSizes={[...new Set([10, 20, 50, 100, pageSize])].sort((a, b) => a - b)} busy={busy} onPageChange={(p) => commit({ page: String(p) }, false)} onPageSizeChange={(s) => commit({ pageSize: String(s) })} />
}
