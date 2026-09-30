import { CalendarBlank, Clock, MagnifyingGlass, Stethoscope, UserCircle } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DateStrip, type DateStripSummary } from '@/features/consultation/components/DateStrip'
import { TimeSlotGrid, type TimeSlotCell } from '@/features/consultation/components/TimeSlotGrid'
import { consultationHorizon, SLOT_START_TIMES, slotEndTime, vietnamToday } from '@/features/consultation/model/slot-grid'
import { expertConsoleApi } from '../api/expert-console-api'
import { useExpertResource } from '../hooks/useExpertResource'
import { expertActionErrorMessage, isExpertApiError, REQUEST_ALREADY_CLAIMED_MESSAGE, SLOT_UNAVAILABLE_MESSAGE } from '../model/expert-console-errors'
import { formatDate, formatDateTime, formatTime } from '../model/expert-console-formatters'
import { consultationStatusLabels, specialtyLabels, type Consultation, type ConsultationStatus, type ConsultationType, type DaySchedule } from '../model/expert-console-types'
import { Dialog, ExpertDateField, ExpertSelect, Pagination, PanelHeading, ResourceState } from './ExpertUI'

const assignedStatuses: Array<{ value: '' | ConsultationStatus; label: string }> = [
  { value: '', label: 'Sắp tư vấn' },
  { value: 'COMPLETED', label: 'Đã hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

function scheduleCells(schedule: DaySchedule | null): TimeSlotCell[] {
  const byTime = new Map(schedule?.slots.map((slot) => [slot.startTime, slot]))
  return SLOT_START_TIMES.map((startTime) => {
    const slot = byTime.get(startTime)
    if (!slot) return { startTime, endTime: slotEndTime(startTime), selectable: false, state: 'CLOSED', reason: schedule?.dayOff ? 'DAY_OFF' : 'CLOSED' }
    const selectable = slot.state === 'OPEN' && !slot.past && !schedule?.dayOff
    return {
      startTime,
      endTime: slot.endTime,
      selectable,
      state: slot.state,
      ...(!selectable ? { reason: slot.past ? 'PAST' as const : schedule?.dayOff ? 'DAY_OFF' as const : slot.state === 'BOOKED' ? 'BOOKED' as const : 'CLOSED' as const } : {}),
    }
  })
}

function AcceptScheduleSkeleton() {
  return <div className="expert-accept-grid-skeleton" aria-busy="true" aria-label="Đang tải lịch làm việc">{SLOT_START_TIMES.map((time) => <span key={time} />)}</div>
}

export function RequestsPanel({ search, setParams, notify, onMutate, refreshToken, assignedTotal, poolTotal }: {
  search: URLSearchParams
  setParams: (values: Record<string, string | undefined>) => void
  notify: (message: string, tone?: 'success' | 'error') => void
  onMutate: () => Promise<void>
  refreshToken: number
  assignedTotal: number
  poolTotal: number
}) {
  const type = (search.get('request_type') === 'pool' ? 'pool' : 'assigned') as ConsultationType
  const status = (search.get('request_status') || '') as '' | ConsultationStatus
  const from = search.get('request_from') || ''
  const to = search.get('request_to') || ''
  const query = search.get('request_q') || ''
  const focusId = search.get('request_focus') || ''
  const page = Math.max(1, Number(search.get('request_page')) || 1)
  const [searchValue, setSearchValue] = useState(query)
  const [accepting, setAccepting] = useState<Consultation | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState('')
  const acceptLock = useRef(false)
  const reduceMotion = useReducedMotion()
  const { minDate, maxDate } = consultationHorizon()

  useEffect(() => setSearchValue(query), [query])
  useEffect(() => {
    if (searchValue === query) return
    const timeout = window.setTimeout(() => setParams({ request_q: searchValue.trim() || undefined, request_page: undefined }), 350)
    return () => window.clearTimeout(timeout)
  }, [query, searchValue, setParams])

  const key = `${type}|${status}|${from}|${to}|${query}|${page}|${refreshToken}`
  const resource = useExpertResource(
    (signal) => expertConsoleApi.consultations({ type, status: type === 'assigned' ? status || 'PENDING_CONSULTATION' : undefined, from: type === 'assigned' ? from || undefined : undefined, to: type === 'assigned' ? to || undefined : undefined, query: query || undefined, page, pageSize: 10 }, signal),
    [key],
  )
  const summaryResource = useExpertResource(
    (signal) => accepting ? expertConsoleApi.scheduleSummary(minDate, maxDate, signal) : Promise.resolve([]),
    [accepting?.id, refreshToken, minDate, maxDate],
  )
  const scheduleResource = useExpertResource<DaySchedule | null>(
    (signal) => accepting && selectedDate ? expertConsoleApi.schedule(selectedDate, signal) : Promise.resolve(null),
    [accepting?.id, selectedDate, refreshToken],
  )
  const summaries = useMemo(() => Object.fromEntries((summaryResource.data || []).map((item): [string, DateStripSummary] => [item.date, {
    openCount: item.openCount,
    bookedCount: item.bookedCount,
    dayOff: item.dayOff,
  }])), [summaryResource.data])
  const cells = useMemo(() => scheduleCells(scheduleResource.data), [scheduleResource.data])
  const selectedCellAvailable = cells.some((cell) => cell.startTime === selectedStartTime && cell.selectable)
  const hasOpenDay = (summaryResource.data || []).some((item) => item.openCount > 0 && !item.dayOff)

  useEffect(() => {
    if (!accepting || summaryResource.loading || !summaryResource.data) return
    const today = vietnamToday()
    const preferred = summaryResource.data.find((item) => item.date === today && item.openCount > 0 && !item.dayOff)
      || summaryResource.data.find((item) => item.openCount > 0 && !item.dayOff)
    setSelectedDate((current) => current && summaryResource.data?.some((item) => item.date === current && item.openCount > 0 && !item.dayOff) ? current : preferred?.date || today)
  }, [accepting, summaryResource.data, summaryResource.loading])

  useEffect(() => {
    if (selectedStartTime && !scheduleResource.loading && scheduleResource.data && !selectedCellAvailable) {
      setSelectedStartTime(null)
      setDialogError(SLOT_UNAVAILABLE_MESSAGE)
    }
  }, [scheduleResource.data, scheduleResource.loading, selectedCellAvailable, selectedStartTime])

  useEffect(() => {
    if (!focusId || resource.loading || !resource.data?.items.some((item) => item.id === focusId)) return
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`expert-request-${focusId}`)
      target?.focus({ preventScroll: true })
      target?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
    })
  }, [focusId, reduceMotion, resource.data, resource.loading])

  function switchType(next: ConsultationType) {
    setParams({ request_type: next === 'pool' ? 'pool' : undefined, request_status: undefined, request_from: undefined, request_to: undefined, request_focus: undefined, request_page: undefined })
  }

  function openAcceptDialog(item: Consultation) {
    setAccepting(item)
    setSelectedDate(null)
    setSelectedStartTime(null)
    setDialogError('')
  }

  function closeAcceptDialog() {
    if (acceptingId) return
    setAccepting(null)
    setSelectedDate(null)
    setSelectedStartTime(null)
    setDialogError('')
  }

  async function accept() {
    if (!accepting || !selectedDate || !selectedStartTime || !selectedCellAvailable || acceptLock.current || acceptingId) return
    const target = accepting
    const targetDate = selectedDate
    acceptLock.current = true
    setAcceptingId(target.id)
    setDialogError('')
    try {
      await expertConsoleApi.acceptConsultation(target.id, targetDate, selectedStartTime)
      await Promise.allSettled([resource.reload(), scheduleResource.reload(), summaryResource.reload(), onMutate()])
      notify(`Đã nhận yêu cầu của ${target.userDisplayName || 'người dùng'}.`)
      setAccepting(null)
      setSelectedStartTime(null)
    } catch (error) {
      if (isExpertApiError(error, 'SLOT_UNAVAILABLE')) {
        setSelectedStartTime(null)
        setDialogError(SLOT_UNAVAILABLE_MESSAGE)
        const [poolResult] = await Promise.all([resource.reload(), scheduleResource.reload(), summaryResource.reload(), onMutate()])
        if (!poolResult?.items.some((item) => item.id === target.id)) setAccepting(null)
        notify(SLOT_UNAVAILABLE_MESSAGE, 'error')
      } else if (isExpertApiError(error, 'REQUEST_ALREADY_CLAIMED')) {
        setAccepting(null)
        setSelectedStartTime(null)
        await Promise.allSettled([resource.reload(), summaryResource.reload(), onMutate()])
        notify(REQUEST_ALREADY_CLAIMED_MESSAGE, 'error')
      } else {
        const message = expertActionErrorMessage(error, 'Không thể nhận yêu cầu tư vấn.')
        setDialogError(message)
        notify(message, 'error')
      }
    } finally {
      acceptLock.current = false
      setAcceptingId(null)
    }
  }

  const hasFilters = Boolean(query || status || from || to)

  return (
    <section className="expert-panel">
      <PanelHeading eyebrow="Điều phối" title="Yêu cầu tư vấn" description="Tiếp nhận yêu cầu mới hoặc xem các buổi đã được giao cho bạn." />
      <div className="expert-segmented" role="tablist" aria-label="Loại yêu cầu">
        <button type="button" role="tab" aria-selected={type === 'assigned'} className={type === 'assigned' ? 'is-active' : ''} onClick={() => switchType('assigned')}>Đã được giao <span>{assignedTotal}</span></button>
        <button type="button" role="tab" aria-selected={type === 'pool'} className={type === 'pool' ? 'is-active' : ''} onClick={() => switchType('pool')}>Đang chờ nhận <span>{poolTotal}</span></button>
      </div>
      <div className={`expert-filters ${type === 'assigned' ? 'four' : 'one'}`}>
        <label className="expert-search-field"><span>Tìm người dùng</span><div><MagnifyingGlass size={17} /><input type="search" value={searchValue} placeholder="Nhập tên người dùng" onChange={(event) => setSearchValue(event.target.value)} /></div></label>
        {type === 'assigned' && <ExpertSelect label="Trạng thái" value={status} options={assignedStatuses} onChange={(value) => setParams({ request_status: value || undefined, request_page: undefined })} />}
        {type === 'assigned' && <ExpertDateField label="Từ ngày" value={from} max={to || undefined} onChange={(value) => setParams({ request_from: value || undefined, request_page: undefined })} />}
        {type === 'assigned' && <ExpertDateField label="Đến ngày" value={to} min={from || undefined} onChange={(value) => setParams({ request_to: value || undefined, request_page: undefined })} />}
      </div>
      <ResourceState
        loading={resource.loading}
        error={resource.error}
        empty={!resource.data?.items.length}
        onRetry={resource.reload}
        emptyTitle={hasFilters ? 'Không có yêu cầu phù hợp' : type === 'pool' ? 'Chưa có yêu cầu đang chờ' : 'Chưa có yêu cầu được giao'}
        emptyMessage={hasFilters ? 'Hãy thay đổi tìm kiếm hoặc bộ lọc.' : type === 'pool' ? 'Yêu cầu đúng chuyên khoa sẽ xuất hiện tại đây.' : 'Các lịch trực tiếp và yêu cầu đã nhận sẽ xuất hiện tại đây.'}
      >
        <div className="expert-request-grid">
          <AnimatePresence initial={false}>
            {resource.data?.items.map((item) => (
              <motion.article
                id={`expert-request-${item.id}`}
                tabIndex={-1}
                className={`expert-request-card${focusId === item.id ? ' is-focused' : ''}`}
                key={item.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
              >
                <header><span className="expert-request-avatar"><UserCircle size={22} weight="duotone" /></span><div><h3>{item.userDisplayName || 'Người dùng'}</h3><p>{specialtyLabels[item.specialty]}</p></div><span className={`expert-badge ${item.status.toLowerCase()}`}>{consultationStatusLabels[item.status]}</span></header>
                <p className="expert-request-note">{item.note || 'Người dùng không để lại ghi chú.'}</p>
                <div className="expert-request-meta">
                  <span><Clock size={16} />{item.slot ? `${formatDate(item.slot.date)} | ${formatTime(item.slot.startTime)} - ${formatTime(item.slot.endTime)}` : type === 'pool' ? `Tạo lúc ${formatDateTime(item.createdAt)}` : 'Chưa xếp lịch'}</span>
                  <span><Stethoscope size={16} />{item.assignmentType === 'DIRECT' ? 'Đặt trực tiếp' : 'Ghép ngẫu nhiên'}</span>
                </div>
                {type === 'pool' && <button className="expert-button primary" type="button" disabled={acceptingId === item.id} onClick={() => openAcceptDialog(item)}>{acceptingId === item.id ? 'Đang tiếp nhận...' : 'Nhận yêu cầu'}</button>}
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
        {resource.data && <Pagination page={resource.data.page} totalPages={resource.data.totalPages} totalItems={resource.data.totalItems} onChange={(next) => setParams({ request_page: String(next) })} />}
      </ResourceState>

      {accepting && <Dialog
        title="Xếp lịch cho yêu cầu"
        description={`Chọn một khung giờ còn mở để nhận yêu cầu của ${accepting.userDisplayName || 'người dùng'}.`}
        onClose={closeAcceptDialog}
        busy={acceptingId === accepting.id}
        actions={<><button className="expert-button secondary" type="button" disabled={acceptingId === accepting.id} onClick={closeAcceptDialog}>Hủy</button><button className="expert-button primary" type="button" disabled={!selectedDate || !selectedStartTime || !selectedCellAvailable || acceptingId === accepting.id || scheduleResource.loading} onClick={() => void accept()}>{acceptingId === accepting.id ? 'Đang tiếp nhận...' : 'Xác nhận tiếp nhận'}</button></>}
      >
        <div className="expert-accept-schedule">
          {summaryResource.loading ? <p className="expert-inline-note" role="status">Đang tải lịch 30 ngày...</p> : summaryResource.error ? <p className="expert-inline-error" role="alert">{summaryResource.error} <button type="button" onClick={() => void summaryResource.reload()}>Thử lại</button></p> : <>
            <DateStrip selectedDate={selectedDate || minDate} summaries={summaries} disabled={acceptingId === accepting.id} onSelect={(date) => { setSelectedDate(date); setSelectedStartTime(null); setDialogError('') }} />
            {!hasOpenDay ? <div className="expert-accept-empty"><CalendarBlank size={24} weight="duotone" /><p>Bạn chưa có khung giờ có thể nhận lịch.</p><button className="expert-button secondary" type="button" onClick={() => { closeAcceptDialog(); setParams({ section: 'slots' }) }}>Đến Lịch làm việc</button></div>
              : scheduleResource.loading ? <AcceptScheduleSkeleton />
                : scheduleResource.error ? <p className="expert-inline-error" role="alert">{scheduleResource.error} <button type="button" onClick={() => void scheduleResource.reload()}>Thử lại</button></p>
                  : <TimeSlotGrid cells={cells} selectedStartTime={selectedStartTime} onSelect={(time) => { setSelectedStartTime(time); setDialogError('') }} disabled={acceptingId === accepting.id} />}
          </>}
          {dialogError && <p className="expert-inline-error" role="alert">{dialogError}</p>}
        </div>
      </Dialog>}
    </section>
  )
}
