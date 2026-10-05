import { CalendarBlank, CaretLeft, CaretRight, Clock, GridFour, ListBullets, Plus } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { isAuthenticationError } from '@/core/api/api-error'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { calendarApi } from '../api/calendar-api'
import { useCalendarData, initialCalendarDate } from '../hooks/useCalendarData'
import { addDays, calendarEventKey, formatCalendarDate, localDate, moveCalendarMonth, startOfWeek } from '../model/calendar-helpers'
import type { CalendarEventItem, CalendarSource, CalendarView, ReminderDetail } from '../model/calendar-types'
import { CalendarEventCard } from './CalendarEventCard'
import { CalendarEventDialog } from './CalendarEventDialog'
import { CalendarToast, type CalendarToastMessage } from './CalendarToast'
import { CalendarDayView, CalendarWeekView } from './CalendarTimelineViews'
import { MonthGrid } from './MonthGrid'
import { ReminderDialog } from './ReminderDialog'
import { DiagnosticCopyButton } from '@/shared/components/DiagnosticCopyButton'

const views: Array<{ value: CalendarView; label: string }> = [{ value: 'MONTH', label: 'Tháng' }, { value: 'WEEK', label: 'Tuần' }, { value: 'DAY', label: 'Ngày' }, { value: 'LIST', label: 'Danh sách' }]
const ownerSources: CalendarSource[] = ['MEDICAL_RECORD', 'CONSULTATION', 'REMINDER']
const sharedSources: CalendarSource[] = ['CONSULTATION', 'REMINDER']

interface Props { pregnancyId?: string; estimatedDueDate?: string; onChanged?: () => void; shared?: boolean; sharedOwnerName?: string }

function titleFor(view: CalendarView, anchor: Date) {
  if (view === 'MONTH' || view === 'LIST') return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(anchor)
  if (view === 'DAY') return formatCalendarDate(anchor)
  const start = startOfWeek(anchor); const end = addDays(start, 6)
  return `Tuần ${new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(start)} – ${new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(end)}`
}

function EventList({ events, loading, error, empty, onOpen, onRetry }: { events: CalendarEventItem[]; loading: boolean; error: string; empty: string; onOpen: (event: CalendarEventItem) => void; onRetry: () => void }) {
  if (loading) return <div className="calendar-agenda-skeleton">{Array.from({ length: 3 }, (_, index) => <span key={index} />)}</div>
  if (error) return <div className="calendar-state"><strong>Chưa tải được lịch</strong><p>{error}</p><DiagnosticCopyButton feature="calendar" event="events_load_failed" error={error} /><button className="secondary-button" type="button" onClick={onRetry}>Thử lại</button></div>
  if (!events.length) return <div className="calendar-state"><CalendarBlank size={30} /><strong>{empty}</strong><p>Bạn có thể thêm lịch nhắc nhở bất cứ lúc nào.</p></div>
  return <div className="calendar-event-list">{events.map((event) => <CalendarEventCard key={calendarEventKey(event)} event={event} onOpen={onOpen} />)}</div>
}

export function CalendarOverview({ pregnancyId, estimatedDueDate, onChanged, shared = false, sharedOwnerName }: Props) {
  const { status: authStatus } = useAuth()
  const [view, setView] = useState<CalendarView>('MONTH')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(initialCalendarDate)
  const [refreshToken, setRefreshToken] = useState(0)
  const [selectedSources, setSelectedSources] = useState<CalendarSource[]>(shared ? sharedSources : ownerSources)
  const [createOpen, setCreateOpen] = useState(false)
  const [activeEvent, setActiveEvent] = useState<CalendarEventItem>()
  const [activeDetail, setActiveDetail] = useState<ReminderDetail>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [editing, setEditing] = useState<ReminderDetail>()
  const [toast, setToast] = useState<CalendarToastMessage>()
  const toastId = useRef(0)
  const detailController = useRef<AbortController | undefined>(undefined)
  const reduceMotion = useReducedMotion()
  const location = useLocation()
  const navigate = useNavigate()
  const authenticated = authStatus === 'authenticated'
  const sourceKey = selectedSources.join(',')
  const requestedSources = useMemo(() => sourceKey ? sourceKey.split(',') as CalendarSource[] : [], [sourceKey])
  const data = useCalendarData(authenticated, view, anchor, selectedDate, refreshToken, shared ? 'shared' : 'owner', requestedSources)

  useEffect(() => {
    if (!shared || !data.sharedMetadata) return
    setSelectedSources((current) => {
      const allowed = data.sharedMetadata!.allowed_sources
      const next = current.filter((source) => allowed.includes(source as 'REMINDER' | 'CONSULTATION'))
      return next.length || !allowed.length ? next : [...allowed]
    })
  }, [data.sharedMetadata, shared])

  const dismissToast = useCallback(() => setToast(undefined), [])
  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    toastId.current += 1
    setToast({ id: toastId.current, message, tone })
  }, [])

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1)
    if (onChanged) onChanged()
    else window.dispatchEvent(new CustomEvent('nutrimom:calendar-changed'))
  }, [onChanged])
  const loadDetail = useCallback(async (id: string) => {
    if (!authenticated) return undefined
    detailController.current?.abort()
    const controller = new AbortController()
    detailController.current = controller
    setDetailLoading(true)
    try {
      const detail = await calendarApi.reminder(id, controller.signal)
      if (!controller.signal.aborted) setActiveDetail(detail)
      return controller.signal.aborted ? undefined : detail
    }
    catch (reason) {
      if (!controller.signal.aborted && !isAuthenticationError(reason)) showToast(reason instanceof Error ? reason.message : 'Không thể tải lịch nhắc nhở.', 'error')
      return undefined
    }
    finally { if (!controller.signal.aborted) setDetailLoading(false) }
  }, [authenticated, showToast])

  const openEvent = useCallback((event: CalendarEventItem) => {
    setActiveEvent(event); setActiveDetail(undefined)
    if (!shared && event.source === 'REMINDER') void loadDetail(event.source_id)
  }, [loadDetail, shared])

  useEffect(() => {
    const reminderId = new URLSearchParams(location.search).get('reminder')
    if (!authenticated || !reminderId || shared) return
    detailController.current?.abort()
    const controller = new AbortController()
    detailController.current = controller
    setDetailLoading(true)
    void calendarApi.reminder(reminderId, controller.signal).then((detail) => {
      if (controller.signal.aborted) return
      setActiveDetail(detail)
      setActiveEvent({ source: 'REMINDER', source_id: detail.id, title: detail.title, subtitle: detail.facility_name, starts_at: detail.starts_at, date: detail.date, status: detail.status, recurring: Boolean(detail.repeat), deep_link: `nutrimom://calendar/reminders/${detail.id}` })
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted && !isAuthenticationError(reason)) showToast(reason instanceof Error ? reason.message : 'Không thể tải lịch nhắc nhở.', 'error')
    }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => controller.abort()
  }, [authenticated, location.search, shared, showToast])

  useEffect(() => () => detailController.current?.abort(), [])

  const grouped = useMemo(() => data.events.reduce((result, event) => {
    const group = result.get(event.date) || []
    group.push(event)
    result.set(event.date, group)
    return result
  }, new Map<string, CalendarEventItem[]>()), [data.events])

  function move(direction: -1 | 1) {
    const next = view === 'MONTH' || view === 'LIST' ? moveCalendarMonth(anchor, direction) : addDays(anchor, direction * (view === 'WEEK' ? 7 : 1))
    setAnchor(next)
    if (view === 'MONTH') setSelectedDate(localDate(new Date(next.getFullYear(), next.getMonth(), 1)))
  }

  function goToday() { const today = new Date(); setAnchor(today); setSelectedDate(localDate(today)) }
  function changed(messageText: string) { setCreateOpen(false); setEditing(undefined); setActiveEvent(undefined); showToast(messageText); refresh() }

  function viewIcon(item: CalendarView) {
    if (item === 'MONTH') return <CalendarBlank size={18} aria-hidden="true" />
    if (item === 'WEEK') return <GridFour size={18} aria-hidden="true" />
    if (item === 'DAY') return <Clock size={18} aria-hidden="true" />
    return <ListBullets size={18} aria-hidden="true" />
  }

  const availableSources = shared ? data.sharedMetadata?.allowed_sources || sharedSources : ownerSources
  const sourceLabels: Record<CalendarSource, string> = { MEDICAL_RECORD: 'Hồ sơ y tế', CONSULTATION: 'Tư vấn', REMINDER: 'Nhắc nhở' }
  function toggleSource(source: CalendarSource) {
    setSelectedSources((current) => current.includes(source) ? (current.length > 1 ? current.filter((item) => item !== source) : current) : [...current, source])
  }

  return <section id="calendar" className="calendar-overview" aria-labelledby="calendar-heading">
    <header className="calendar-overview-header">
      <div className="calendar-heading-group">
        <h2 id="calendar-heading">{titleFor(view, anchor)}</h2>
        <div className="calendar-navigation"><button type="button" aria-label="Trước" onClick={() => move(-1)}><CaretLeft size={19} /></button><button type="button" onClick={goToday}>Hôm nay</button><button type="button" aria-label="Sau" onClick={() => move(1)}><CaretRight size={19} /></button></div>
      </div>
      <div className="calendar-header-actions">
        <div className="calendar-view-mobile"><AnimatedSelect label="Chế độ xem" labelClassName="calendar-visually-hidden" value={view} options={views} onValueChange={setView} /></div>
        <div className="calendar-view-tabs" role="tablist" aria-label="Chế độ xem lịch">{views.map((item) => <button type="button" role="tab" aria-selected={view === item.value} key={item.value} onClick={() => setView(item.value)}>{viewIcon(item.value)}<span>{item.label}</span></button>)}</div>
        {!shared && <button className="primary-button calendar-create-button" type="button" onClick={() => setCreateOpen(true)}><Plus size={19} />Thêm lịch nhắc nhở</button>}
      </div>
    </header>
    <div className="calendar-support-row"><p>{shared ? `Lịch được chia sẻ bởi ${data.sharedMetadata?.owner_display_name || sharedOwnerName || 'chủ thai kỳ'}. Chỉ có quyền xem.` : 'Mốc chăm sóc, tư vấn và nhắc nhở của riêng bạn.'}</p><div className="calendar-legend" aria-label="Lọc nguồn lịch">{availableSources.map((source) => <button type="button" key={source} aria-pressed={selectedSources.includes(source)} onClick={() => toggleSource(source)}><i className={`source-${source.toLowerCase()}`} />{sourceLabels[source]}</button>)}</div></div>
    <CalendarToast toast={toast} onClose={dismissToast} />
    <AnimatePresence mode="wait" initial={false}><motion.div className="calendar-view" key={view} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }} transition={{ duration: reduceMotion ? 0 : .2 }}>
      {view === 'MONTH' ? <div className="calendar-month-layout"><div>{data.monthError ? <div className="calendar-state"><p>{data.monthError}</p><DiagnosticCopyButton feature={shared ? 'shared-calendar' : 'calendar'} event="month_load_failed" error={data.monthError} /><button className="secondary-button" type="button" onClick={() => void data.retryMonth()}>Thử lại</button></div> : <MonthGrid anchor={anchor} selectedDate={selectedDate} items={data.monthItems} loading={data.monthLoading} onSelect={(date) => { setSelectedDate(date); const chosen = new Date(`${date}T12:00:00`); if (chosen.getMonth() !== anchor.getMonth()) setAnchor(chosen) }} />}</div><aside className="calendar-day-agenda"><header><span>Lịch trong ngày</span><strong>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date(`${selectedDate}T12:00:00`))}</strong></header><EventList events={data.events} loading={data.eventsLoading} error={data.eventsError} empty="Ngày này chưa có lịch" onOpen={openEvent} onRetry={() => void data.retryEvents()} /></aside></div>
        : view === 'WEEK' ? <CalendarWeekView anchor={anchor} events={data.events} loading={data.eventsLoading} error={data.eventsError} onOpen={openEvent} onRetry={() => void data.retryEvents()} />
          : view === 'DAY' ? <CalendarDayView anchor={anchor} events={data.events} loading={data.eventsLoading} error={data.eventsError} onOpen={openEvent} onRetry={() => void data.retryEvents()} />
            : <div className="calendar-range-view is-list">{data.eventsLoading || data.eventsError || !data.events.length ? <EventList events={data.events} loading={data.eventsLoading} error={data.eventsError} empty="Tháng này chưa có lịch" onOpen={openEvent} onRetry={() => void data.retryEvents()} /> : [...grouped.entries()].map(([date, events]) => <section className="calendar-date-group" key={date}><header><time dateTime={date}>{formatCalendarDate(`${date}T12:00:00`)}</time><span>{events.length} mốc</span></header><div className="calendar-event-list">{events.map((event) => <CalendarEventCard key={calendarEventKey(event)} event={event} onOpen={openEvent} />)}</div></section>)}</div>}
    </motion.div></AnimatePresence>
    {!shared && <ReminderDialog open={createOpen || Boolean(editing)} detail={editing} pregnancyId={pregnancyId} estimatedDueDate={estimatedDueDate} onClose={() => { setCreateOpen(false); setEditing(undefined) }} onSaved={(saved) => changed(`${editing ? 'Đã cập nhật' : 'Đã tạo'} lịch nhắc nhở. Lần tiếp theo: ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(saved.next_occurrence || saved.starts_at))}.`)} onConflict={(latest) => setEditing(latest)} />}
    <CalendarEventDialog readOnly={shared} open={Boolean(activeEvent)} event={activeEvent} detail={activeDetail} loading={detailLoading} onClose={() => { setActiveEvent(undefined); setActiveDetail(undefined); const params = new URLSearchParams(location.search); if (params.has('reminder')) { params.delete('reminder'); navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true }) } }} onEdit={(detail) => { setActiveEvent(undefined); setEditing(detail) }} onRefresh={refresh} onNotify={showToast} onReloadDetail={() => !shared && activeEvent?.source_id ? loadDetail(activeEvent.source_id) : Promise.resolve(undefined)} />
  </section>
}
