import { ArrowCounterClockwise, ArrowSquareOut, Check, PencilSimple, SkipForward, Trash } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { adaptDeepLink } from '@/features/notifications/model/notification-helpers'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { calendarApi } from '../api/calendar-api'
import { runCalendarAction } from '../model/calendar-action-feedback'
import { calendarStatusLabel, formatEventTime, isCalendarStatusComplete, occurrenceActionMode } from '../model/calendar-helpers'
import type { CalendarEventItem, ReminderDetail } from '../model/calendar-types'

interface Props {
  event?: CalendarEventItem
  detail?: ReminderDetail
  loading?: boolean
  open: boolean
  onClose: () => void
  onEdit: (detail: ReminderDetail) => void
  onRefresh: () => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
  onReloadDetail: () => Promise<ReminderDetail | undefined>
  readOnly?: boolean
}

export function CalendarEventDialog({ event, detail, loading, open, onClose, onEdit, onRefresh, onNotify, onReloadDetail, readOnly = false }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [suggestion, setSuggestion] = useState<{ startsAt: string; source: ReminderDetail }>()
  const navigate = useNavigate()
  useEffect(() => { if (open) { setError(''); setConfirmDelete(false); setSuggestion(undefined) } }, [open, event])

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true); setError('')
    try { await runCalendarAction(action, () => { onRefresh(); onNotify(successMessage); onClose() }) }
    catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT') { setError('Dữ liệu đã thay đổi, vui lòng tải lại.'); await onReloadDetail() }
      else setError(reason instanceof Error ? reason.message : 'Không thể cập nhật lịch nhắc nhở.')
    } finally { setBusy(false) }
  }

  function openDeepLink() {
    const target = adaptDeepLink(event?.deep_link)
    if (target.path) { onClose(); navigate(target.path) }
    else setError(target.message || 'Không có màn hình chi tiết cho mốc này.')
  }

  async function completeOneTime() {
    if (!detail) return
    setBusy(true); setError('')
    try {
      const updated = await calendarApi.updateReminder(detail.id, { version: detail.version, status: 'DONE' })
      onRefresh()
      onNotify('Đã đánh dấu lịch nhắc là đã làm.')
      if (updated.next_suggestion) setSuggestion({ startsAt: updated.next_suggestion, source: updated })
      else onClose()
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT') { setError('Dữ liệu đã thay đổi, vui lòng tải lại.'); await onReloadDetail() }
      else setError(reason instanceof Error ? reason.message : 'Không thể đánh dấu đã làm.')
    } finally { setBusy(false) }
  }

  async function createSuggestion() {
    if (!suggestion) return
    const source = suggestion.source
    await run(async () => {
      await calendarApi.createReminder({ type: source.type, title: source.title, starts_at: suggestion.startsAt, ...(source.facility_name ? { facility_name: source.facility_name } : {}), ...(source.note ? { note: source.note } : {}), ...(source.remind_minutes_before !== undefined ? { remind_minutes_before: source.remind_minutes_before } : {}), ...(source.pregnancy_id ? { pregnancy_id: source.pregnancy_id } : {}) })
      setSuggestion(undefined)
    }, 'Đã tạo lịch nhắc tiếp theo.')
  }

  const occurrenceMode = occurrenceActionMode(event?.status)
  const visibleStatusValue = event?.status || detail?.status
  const visibleStatus = calendarStatusLabel(visibleStatusValue)

  return <>
    <AccessibleDialog open={open} title={event?.title || 'Chi tiết lịch'} description={event?.subtitle} onClose={onClose} busy={busy} className="calendar-event-dialog">
      {loading ? <div className="calendar-detail-loading"><span /><span /><span /></div> : event && <div className="calendar-event-detail">
        <dl><div><dt>Thời gian</dt><dd>{formatEventTime(event)}</dd></div><div><dt>Nguồn</dt><dd>{event.source === 'REMINDER' ? 'Nhắc nhở' : event.source === 'CONSULTATION' ? 'Tư vấn' : 'Hồ sơ y tế'}</dd></div>{visibleStatus && <div><dt>Trạng thái</dt><dd><span className={`calendar-status-badge is-${(visibleStatusValue || '').toLowerCase()}`}>{isCalendarStatusComplete(visibleStatusValue) && <Check size={15} weight="bold" />}{visibleStatus}</span></dd></div>}{detail?.facility_name && <div><dt>Cơ sở y tế</dt><dd>{detail.facility_name}</dd></div>}{detail?.note && <div><dt>Ghi chú</dt><dd>{detail.note}</dd></div>}{detail?.remind_minutes_before !== undefined && <div><dt>Nhắc trước</dt><dd>{detail.remind_minutes_before} phút</dd></div>}{detail?.next_occurrence && <div><dt>Lần tiếp theo</dt><dd>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(detail.next_occurrence))}</dd></div>}</dl>
        {readOnly ? <p className="calendar-read-only-note">Đây là thông tin tóm tắt từ lịch được chia sẻ. Bạn không thể chỉnh sửa hoặc mở chi tiết riêng tư của chủ lịch.</p> : event.source !== 'REMINDER' ? <button className="primary-button" type="button" onClick={openDeepLink}><ArrowSquareOut size={18} />Mở màn hình liên quan</button> : detail && <div className="calendar-detail-actions">
          <div className="calendar-occurrence-actions" aria-label="Cập nhật trạng thái">
            {event.recurring && occurrenceMode === 'SET' && <><button className="primary-button calendar-dialog-action" type="button" disabled={busy} onClick={() => void run(() => calendarApi.updateOccurrence(event.source_id, event.starts_at, 'DONE'), 'Đã đánh dấu lần nhắc này là đã làm.')}><Check size={18} />Đánh dấu đã làm</button><button className="secondary-button calendar-dialog-action" type="button" disabled={busy} onClick={() => void run(() => calendarApi.updateOccurrence(event.source_id, event.starts_at, 'SKIPPED'), 'Đã bỏ qua lần nhắc này.')}><SkipForward size={18} />Bỏ qua lần này</button></>}
            {event.recurring && occurrenceMode === 'UNDO' && <button className="secondary-button calendar-dialog-action" type="button" disabled={busy} onClick={() => void run(() => calendarApi.updateOccurrence(event.source_id, event.starts_at), 'Đã hoàn tác đánh dấu cho lần nhắc này.')}><ArrowCounterClockwise size={18} />Hoàn tác đánh dấu</button>}
            {!event.recurring && detail.status !== 'DONE' && <button className="primary-button calendar-dialog-action" type="button" disabled={busy} onClick={() => void completeOneTime()}><Check size={18} />Đánh dấu đã làm</button>}
          </div>
          <div className="calendar-management-actions" aria-label="Quản lý lịch">
            <button className="secondary-button calendar-dialog-action" type="button" disabled={busy} onClick={() => onEdit(detail)}><PencilSimple size={18} />Sửa</button>
            <button className="danger-button calendar-dialog-action" type="button" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash size={18} />Xóa lịch</button>
          </div>
        </div>}
        {error && <p className="nm-dialog-error" role="alert">{error}</p>}
      </div>}
    </AccessibleDialog>
    <AccessibleDialog open={confirmDelete} title="Xóa lịch nhắc nhở?" description="Lịch sẽ được xóa sau khi máy chủ xác nhận." onClose={() => setConfirmDelete(false)} busy={busy} footer={<><button className="secondary-button" type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>Giữ lịch</button><button className="danger-submit" type="button" disabled={busy} onClick={() => void run(async () => { if (!detail) return; await calendarApi.deleteReminder(detail.id); setConfirmDelete(false) }, 'Đã xóa lịch nhắc nhở.')}>{busy ? 'Đang xóa...' : 'Xóa lịch'}</button></>}><p>Thao tác này không ảnh hưởng hồ sơ y tế hoặc lịch tư vấn liên quan.</p></AccessibleDialog>
    <AccessibleDialog open={Boolean(suggestion)} title="Tạo lịch tiếp theo?" description={suggestion ? `Mốc gợi ý: ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(suggestion.startsAt))}` : undefined} onClose={() => setSuggestion(undefined)} busy={busy} footer={<><button className="secondary-button" type="button" disabled={busy} onClick={() => { setSuggestion(undefined); onClose() }}>Để sau</button><button className="primary-button" type="button" disabled={busy} onClick={() => void createSuggestion()}>{busy ? 'Đang tạo...' : 'Tạo lịch tiếp theo'}</button></>}><p>NutriMom chỉ tạo mốc mới khi bạn xác nhận.</p></AccessibleDialog>
  </>
}
