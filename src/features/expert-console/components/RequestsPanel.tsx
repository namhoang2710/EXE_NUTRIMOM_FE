import { CheckCircle, Clock, MagnifyingGlass, Stethoscope, UserCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { expertConsoleApi } from '../api/expert-console-api'
import { useExpertResource } from '../hooks/useExpertResource'
import { consultationStatusLabels, specialtyLabels, type Consultation, type ConsultationStatus, type ConsultationType } from '../model/expert-console-types'
import { formatDate, formatTime } from '../model/expert-console-formatters'
import { Dialog, Pagination, PanelHeading, ResourceState } from './ExpertUI'

const assignedStatuses: Array<{ value: '' | ConsultationStatus; label: string }> = [
  { value: '', label: 'Sắp tư vấn' }, { value: 'COMPLETED', label: 'Đã hoàn tất' }, { value: 'CANCELLED', label: 'Đã hủy' },
]

export function RequestsPanel({ search, setParams, notify, onMutate }: {
  search: URLSearchParams
  setParams: (values: Record<string, string | undefined>) => void
  notify: (message: string, tone?: 'success' | 'error') => void
  onMutate: () => void
}) {
  const type = (search.get('request_type') === 'pool' ? 'pool' : 'assigned') as ConsultationType
  const status = (search.get('request_status') || '') as '' | ConsultationStatus
  const from = search.get('request_from') || ''
  const to = search.get('request_to') || ''
  const query = search.get('request_q') || ''
  const page = Math.max(1, Number(search.get('request_page')) || 1)
  const [searchValue, setSearchValue] = useState(query)
  const [accepting, setAccepting] = useState<Consultation | null>(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => setSearchValue(query), [query])
  useEffect(() => {
    if (searchValue === query) return
    const timeout = window.setTimeout(() => setParams({ request_q: searchValue.trim() || undefined, request_page: undefined }), 350)
    return () => window.clearTimeout(timeout)
  }, [query, searchValue, setParams])

  const key = `${type}|${status}|${from}|${to}|${query}|${page}`
  const resource = useExpertResource(
    (signal) => expertConsoleApi.consultations({ type, status: type === 'assigned' ? status || undefined : undefined, from: from || undefined, to: to || undefined, query: query || undefined, page, pageSize: 10 }, signal),
    [key],
  )
  const openSlots = useExpertResource(
    (signal) => accepting ? expertConsoleApi.slots({ status: 'OPEN', from: new Date().toISOString().slice(0, 10) }, signal) : Promise.resolve([]),
    [accepting?.id],
  )

  function switchType(next: ConsultationType) {
    setParams({ request_type: next === 'pool' ? 'pool' : undefined, request_status: undefined, request_from: undefined, request_to: undefined, request_page: undefined })
  }

  async function accept() {
    if (!accepting || !selectedSlot) return
    setSubmitting(true)
    try {
      await expertConsoleApi.acceptConsultation(accepting.id, selectedSlot)
      notify(`Đã nhận yêu cầu của ${accepting.userDisplayName}.`)
      setAccepting(null)
      setSelectedSlot('')
      await resource.reload()
      onMutate()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể nhận yêu cầu tư vấn.', 'error')
      await openSlots.reload()
    } finally {
      setSubmitting(false)
    }
  }

  async function complete(item: Consultation) {
    setSubmitting(true)
    try {
      await expertConsoleApi.completeConsultation(item.id)
      notify(`Đã hoàn tất buổi tư vấn với ${item.userDisplayName}.`)
      await resource.reload()
      onMutate()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể cập nhật yêu cầu.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="expert-panel">
      <PanelHeading eyebrow="Điều phối" title="Yêu cầu tư vấn" description="Tiếp nhận yêu cầu mới hoặc quản lý các buổi đã được giao cho bạn." />
      <div className="expert-segmented" role="tablist" aria-label="Loại yêu cầu">
        <button type="button" role="tab" aria-selected={type === 'assigned'} className={type === 'assigned' ? 'is-active' : ''} onClick={() => switchType('assigned')}>Đã được giao</button>
        <button type="button" role="tab" aria-selected={type === 'pool'} className={type === 'pool' ? 'is-active' : ''} onClick={() => switchType('pool')}>Đang chờ nhận</button>
      </div>
      <div className={`expert-filters ${type === 'assigned' ? 'four' : 'one'}`}>
        <label className="expert-search-field"><span>Tìm người dùng</span><div><MagnifyingGlass size={17} /><input type="search" value={searchValue} placeholder="Nhập tên người dùng…" onChange={(event) => setSearchValue(event.target.value)} /></div></label>
        {type === 'assigned' && <label><span>Trạng thái</span><select value={status} onChange={(event) => setParams({ request_status: event.target.value || undefined, request_page: undefined })}>{assignedStatuses.map((item) => <option key={item.value || 'current'} value={item.value}>{item.label}</option>)}</select></label>}
        {type === 'assigned' && <label><span>Từ ngày</span><input type="date" value={from} max={to || undefined} onChange={(event) => setParams({ request_from: event.target.value || undefined, request_page: undefined })} /></label>}
        {type === 'assigned' && <label><span>Đến ngày</span><input type="date" value={to} min={from || undefined} onChange={(event) => setParams({ request_to: event.target.value || undefined, request_page: undefined })} /></label>}
      </div>
      <ResourceState loading={resource.loading} error={resource.error} empty={!resource.data?.items.length} onRetry={resource.reload}>
        <div className="expert-request-grid">
          {resource.data?.items.map((item) => <article className="expert-request-card" key={item.id}>
            <header><span className="expert-request-avatar"><UserCircle size={22} weight="duotone" /></span><div><h3>{item.userDisplayName}</h3><p>{specialtyLabels[item.specialty]}</p></div><span className={`expert-badge ${item.status.toLowerCase()}`}>{consultationStatusLabels[item.status]}</span></header>
            <p className="expert-request-note">{item.note || 'Người dùng không để lại ghi chú.'}</p>
            <div className="expert-request-meta"><span><Clock size={16} />{item.slot ? `${formatDate(item.slot.date)} · ${formatTime(item.slot.startTime)}–${formatTime(item.slot.endTime)}` : 'Chưa có khung giờ'}</span><span><Stethoscope size={16} />{item.assignmentType === 'DIRECT' ? 'Đặt trực tiếp' : 'Ghép ngẫu nhiên'}</span></div>
            {type === 'pool' && <button className="expert-button primary" type="button" onClick={() => { setAccepting(item); setSelectedSlot('') }}>Nhận yêu cầu</button>}
            {type === 'assigned' && item.status === 'PENDING_CONSULTATION' && <button className="expert-button secondary" type="button" disabled={submitting} onClick={() => void complete(item)}><CheckCircle size={17} /> Hoàn tất tư vấn</button>}
          </article>)}
        </div>
        {resource.data && <Pagination page={resource.data.page} totalPages={resource.data.totalPages} totalItems={resource.data.totalItems} onChange={(next) => setParams({ request_page: String(next) })} />}
      </ResourceState>
      {accepting && <Dialog title="Xếp lịch cho yêu cầu" description={`Chọn một khung giờ còn trống để nhận yêu cầu của ${accepting.userDisplayName}.`} onClose={() => !submitting && setAccepting(null)} actions={<><button className="expert-button secondary" type="button" disabled={submitting} onClick={() => setAccepting(null)}>Hủy</button><button className="expert-button primary" type="button" disabled={!selectedSlot || submitting} onClick={() => void accept()}>{submitting ? 'Đang tiếp nhận…' : 'Xác nhận tiếp nhận'}</button></>}>
        <label className="expert-dialog-field"><span>Khung giờ tư vấn</span><select value={selectedSlot} disabled={openSlots.loading || Boolean(openSlots.error)} onChange={(event) => setSelectedSlot(event.target.value)}><option value="">{openSlots.loading ? 'Đang tải khung giờ…' : 'Chọn khung giờ'}</option>{openSlots.data?.map((slot) => <option key={slot.id} value={slot.id}>{formatDate(slot.date)} · {formatTime(slot.startTime)}–{formatTime(slot.endTime)}</option>)}</select></label>
        {openSlots.error && <p className="expert-inline-error">{openSlots.error}</p>}
        {!openSlots.loading && !openSlots.error && !openSlots.data?.length && <p className="expert-inline-note">Bạn chưa có khung giờ trống. Hãy tạo slot trước khi nhận yêu cầu.</p>}
      </Dialog>}
    </section>
  )
}
