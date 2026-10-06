import { CalendarBlank, CheckCircle, CircleNotch, Clock, UserCircle } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'
import { VideoRoomLink } from '@/features/consultation-video/components/VideoRoomLink'
import { runAsyncAction } from '@/shared/model/async-action'
import { expertConsoleApi } from '../api/expert-console-api'
import { useExpertResource } from '../hooks/useExpertResource'
import { expertActionErrorMessage, isExpertApiError } from '../model/expert-console-errors'
import { formatDate, formatTime } from '../model/expert-console-formatters'
import { consultationStatusLabels, specialtyLabels, type Consultation, type ConsultationStatus } from '../model/expert-console-types'
import { Dialog, ExpertDateField, ExpertSelect, Pagination, PanelHeading, ResourceState } from './ExpertUI'

const statuses: Array<{ value: '' | ConsultationStatus; label: string }> = [
  { value: '', label: 'Sắp tư vấn' },
  { value: 'COMPLETED', label: 'Đã hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

export function SchedulePanel({ search, setParams, notify, onMutate, refreshToken }: {
  search: URLSearchParams
  setParams: (values: Record<string, string | undefined>) => void
  notify: (message: string, tone?: 'success' | 'error') => void
  onMutate: () => Promise<void>
  refreshToken: number
}) {
  const status = (search.get('schedule_status') || '') as '' | ConsultationStatus
  const from = search.get('schedule_from') || ''
  const to = search.get('schedule_to') || ''
  const page = Math.max(1, Number(search.get('schedule_page')) || 1)
  const key = `${status}|${from}|${to}|${page}|${refreshToken}`
  const resource = useExpertResource(
    (signal) => expertConsoleApi.consultations({ type: 'assigned', status: status || 'PENDING_CONSULTATION', from: from || undefined, to: to || undefined, page, pageSize: 10 }, signal),
    [key],
  )
  const [confirming, setConfirming] = useState<Consultation | null>(null)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const completionLock = useRef(false)
  const reduceMotion = useReducedMotion()
  const nextAppointment = resource.data?.items[0] ?? null

  async function complete() {
    if (!confirming || completionLock.current || completingId) return
    const target = confirming
    completionLock.current = true
    setCompletingId(target.id)
    try {
      await runAsyncAction({
        action: async () => {
          await expertConsoleApi.completeConsultation(target.id)
        },
        minimumMs: 2000,
      })
      await Promise.allSettled([resource.reload(), onMutate()])
      notify('Đã đánh dấu buổi tư vấn hoàn tất.')
      setConfirming(null)
    } catch (error) {
      await Promise.allSettled([resource.reload(), onMutate()])
      notify(expertActionErrorMessage(error, 'Không thể hoàn tất buổi tư vấn.'), 'error')
      if (isExpertApiError(error, 'INVALID_CONSULTATION_STATE')) setConfirming(null)
    } finally {
      completionLock.current = false
      setCompletingId(null)
    }
  }

  const hasFilters = Boolean(status || from || to)

  return (
    <section className="expert-panel">
      <PanelHeading eyebrow="Lịch làm việc" title="Lịch tư vấn" description="Theo dõi các buổi sắp tới và lịch sử tư vấn theo thời gian." />
      {nextAppointment && !status && (
        <div className="expert-next-call">
          <span><CalendarBlank size={21} weight="duotone" /></span>
          <div><small>Buổi gần nhất</small><strong>{nextAppointment.slot ? `${formatDate(nextAppointment.slot.date)} lúc ${formatTime(nextAppointment.slot.startTime)}` : 'Chưa xếp lịch'}</strong></div>
          <p>{nextAppointment.userDisplayName || 'Người dùng'}</p>
        </div>
      )}
      <div className="expert-filters three">
        <ExpertSelect label="Trạng thái" value={status} options={statuses} onChange={(value) => setParams({ schedule_status: value || undefined, schedule_page: undefined })} />
        <ExpertDateField label="Từ ngày" value={from} max={to || undefined} onChange={(value) => setParams({ schedule_from: value || undefined, schedule_page: undefined })} />
        <ExpertDateField label="Đến ngày" value={to} min={from || undefined} onChange={(value) => setParams({ schedule_to: value || undefined, schedule_page: undefined })} />
      </div>
      <ResourceState
        loading={resource.loading}
        error={resource.error}
        empty={!resource.data?.items.length}
        onRetry={resource.reload}
        emptyTitle={hasFilters ? 'Không có lịch phù hợp' : 'Chưa có lịch tư vấn sắp tới'}
        emptyMessage={hasFilters ? 'Hãy thay đổi trạng thái hoặc khoảng ngày.' : 'Lịch đặt trực tiếp và yêu cầu bạn tiếp nhận sẽ xuất hiện tại đây.'}
      >
        <div className="expert-consultation-list">
          <AnimatePresence initial={false}>
            {resource.data?.items.map((item) => (
              <motion.article
                className="expert-consultation"
                key={item.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
              >
                <div className="expert-date-tile"><strong>{item.slot ? formatTime(item.slot.startTime) : 'Chưa xếp lịch'}</strong><span>{item.slot ? formatDate(item.slot.date).split(',').at(-1) : 'Chưa xếp lịch'}</span></div>
                <div className="expert-consultation-main">
                  <div><UserCircle size={18} /><strong>{item.userDisplayName || 'Người dùng'}</strong><span className={`expert-badge ${item.status.toLowerCase()}`}>{consultationStatusLabels[item.status]}</span></div>
                  <p>{item.note || 'Không có ghi chú từ người đặt.'}</p>
                  <small>{specialtyLabels[item.specialty]} | {item.assignmentType === 'DIRECT' ? 'Đặt trực tiếp' : 'Yêu cầu ngẫu nhiên'}{item.slot ? ` | ${formatTime(item.slot.startTime)} - ${formatTime(item.slot.endTime)}` : ''}</small>
                </div>
                {item.status === 'PENDING_CONSULTATION'
                  ? <div className="expert-video-actions"><VideoRoomLink id={item.id} expert className="expert-button expert-video-room-button" /><button className="expert-button expert-complete-trigger" type="button" disabled={completingId === item.id} onClick={() => setConfirming(item)}><CheckCircle size={17} /> {completingId === item.id ? 'Đang hoàn tất...' : 'Hoàn tất'}</button></div>
                  : <Clock className="expert-row-icon" size={20} />}
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
        {resource.data && <Pagination page={resource.data.page} totalPages={resource.data.totalPages} totalItems={resource.data.totalItems} onChange={(next) => setParams({ schedule_page: String(next) })} />}
      </ResourceState>
      {confirming && (
        <Dialog
          title="Xác nhận hoàn tất tư vấn?"
          description="Thao tác này không thể hoàn tác. Sau khi hoàn tất, người dùng có thể gửi đánh giá."
          onClose={() => setConfirming(null)}
          busy={completingId === confirming.id}
          actions={<><button className="expert-button secondary" type="button" disabled={completingId === confirming.id} onClick={() => setConfirming(null)}>Quay lại</button><button className="expert-button expert-complete-confirm" type="button" disabled={completingId === confirming.id} aria-busy={completingId === confirming.id} onClick={() => void complete()}>{completingId === confirming.id && <CircleNotch className="nm-stateful-spinner" size={19} weight="bold" aria-hidden="true" />}<span>{completingId === confirming.id ? 'Đang hoàn tất...' : 'Xác nhận hoàn tất'}</span></button></>}
        >
          <dl className="expert-confirmation-details">
            <div><dt>Người dùng</dt><dd>{confirming.userDisplayName || 'Người dùng'}</dd></div>
            <div><dt>Thời gian</dt><dd>{confirming.slot ? `${formatDate(confirming.slot.date)}, ${formatTime(confirming.slot.startTime)} - ${formatTime(confirming.slot.endTime)}` : 'Chưa xếp lịch'}</dd></div>
          </dl>
        </Dialog>
      )}
    </section>
  )
}
