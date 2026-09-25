import { CalendarBlank, CheckCircle, Clock, UserCircle } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { expertConsoleApi } from '../api/expert-console-api'
import { useExpertResource } from '../hooks/useExpertResource'
import { consultationStatusLabels, specialtyLabels, type ConsultationStatus } from '../model/expert-console-types'
import { formatDate, formatTime } from '../model/expert-console-formatters'
import { Pagination, PanelHeading, ResourceState } from './ExpertUI'

const statuses: Array<{ value: '' | ConsultationStatus; label: string }> = [
  { value: '', label: 'Sắp tư vấn' }, { value: 'COMPLETED', label: 'Đã hoàn tất' }, { value: 'CANCELLED', label: 'Đã hủy' },
]

export function SchedulePanel({ search, setParams, notify, onMutate }: {
  search: URLSearchParams
  setParams: (values: Record<string, string | undefined>) => void
  notify: (message: string, tone?: 'success' | 'error') => void
  onMutate: () => void
}) {
  const status = (search.get('schedule_status') || '') as '' | ConsultationStatus
  const from = search.get('schedule_from') || ''
  const to = search.get('schedule_to') || ''
  const page = Math.max(1, Number(search.get('schedule_page')) || 1)
  const key = `${status}|${from}|${to}|${page}`
  const resource = useExpertResource(
    (signal) => expertConsoleApi.consultations({ type: 'assigned', status: status || undefined, from: from || undefined, to: to || undefined, page, pageSize: 10 }, signal),
    [key],
  )
  const [completing, nextAppointment] = useMemo(() => [false, resource.data?.items[0] ?? null], [resource.data])

  async function complete(id: string) {
    try {
      await expertConsoleApi.completeConsultation(id)
      notify('Đã đánh dấu buổi tư vấn hoàn tất.')
      await resource.reload()
      onMutate()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể hoàn tất buổi tư vấn.', 'error')
    }
  }

  return (
    <section className="expert-panel">
      <PanelHeading eyebrow="Lịch làm việc" title="Lịch tư vấn" description="Theo dõi các buổi sắp tới và lịch sử tư vấn theo thời gian." />
      {nextAppointment && !status && <div className="expert-next-call"><span><CalendarBlank size={21} weight="duotone" /></span><div><small>Buổi gần nhất</small><strong>{nextAppointment.slot ? `${formatDate(nextAppointment.slot.date)} · ${formatTime(nextAppointment.slot.startTime)}` : 'Chưa có khung giờ'}</strong></div><p>{nextAppointment.userDisplayName}</p></div>}
      <div className="expert-filters three">
        <label><span>Trạng thái</span><select value={status} onChange={(event) => setParams({ schedule_status: event.target.value || undefined, schedule_page: undefined })}>{statuses.map((item) => <option key={item.value || 'upcoming'} value={item.value}>{item.label}</option>)}</select></label>
        <label><span>Từ ngày</span><input type="date" value={from} max={to || undefined} onChange={(event) => setParams({ schedule_from: event.target.value || undefined, schedule_page: undefined })} /></label>
        <label><span>Đến ngày</span><input type="date" value={to} min={from || undefined} onChange={(event) => setParams({ schedule_to: event.target.value || undefined, schedule_page: undefined })} /></label>
      </div>
      <ResourceState loading={resource.loading} error={resource.error} empty={!resource.data?.items.length} onRetry={resource.reload}>
        <div className="expert-consultation-list">
          {resource.data?.items.map((item) => <article className="expert-consultation" key={item.id}>
            <div className="expert-date-tile"><strong>{item.slot ? formatTime(item.slot.startTime) : '—'}</strong><span>{item.slot ? formatDate(item.slot.date).split(',').at(-1) : 'Chưa xếp lịch'}</span></div>
            <div className="expert-consultation-main"><div><UserCircle size={18} /><strong>{item.userDisplayName}</strong><span className={`expert-badge ${item.status.toLowerCase()}`}>{consultationStatusLabels[item.status]}</span></div><p>{item.note || 'Không có ghi chú từ người đặt.'}</p><small>{specialtyLabels[item.specialty]} · {item.assignmentType === 'DIRECT' ? 'Đặt trực tiếp' : 'Yêu cầu ngẫu nhiên'}</small></div>
            {item.status === 'PENDING_CONSULTATION' && <button className="expert-button subtle" type="button" disabled={completing} onClick={() => void complete(item.id)}><CheckCircle size={17} /> Hoàn tất</button>}
            {item.status !== 'PENDING_CONSULTATION' && <Clock className="expert-row-icon" size={20} />}
          </article>)}
        </div>
        {resource.data && <Pagination page={resource.data.page} totalPages={resource.data.totalPages} totalItems={resource.data.totalItems} onChange={(next) => setParams({ schedule_page: String(next) })} />}
      </ResourceState>
    </section>
  )
}

