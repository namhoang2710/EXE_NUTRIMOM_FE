import { Clock, Plus, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { expertConsoleApi } from '../api/expert-console-api'
import { useExpertResource } from '../hooks/useExpertResource'
import { formatDate, formatTime, todayIso } from '../model/expert-console-formatters'
import type { ExpertSlot, SlotStatus } from '../model/expert-console-types'
import { Dialog, PanelHeading, ResourceState } from './ExpertUI'

export function SlotsPanel({ search, setParams, notify, onMutate }: {
  search: URLSearchParams
  setParams: (values: Record<string, string | undefined>) => void
  notify: (message: string, tone?: 'success' | 'error') => void
  onMutate: () => void
}) {
  const date = search.get('slot_date') || ''
  const from = search.get('slot_from') || ''
  const to = search.get('slot_to') || ''
  const status = (search.get('slot_status') || '') as '' | SlotStatus
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<ExpertSlot | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [slotForm, setSlotForm] = useState({ date: todayIso(), startTime: '08:00', endTime: '08:30' })
  const [formError, setFormError] = useState('')
  const key = `${date}|${from}|${to}|${status}`
  const resource = useExpertResource(
    (signal) => expertConsoleApi.slots({ date: date || undefined, from: from || undefined, to: to || undefined, status: status || undefined }, signal),
    [key],
  )

  async function createSlot() {
    setFormError('')
    if (!slotForm.date || !slotForm.startTime || !slotForm.endTime) { setFormError('Vui lòng nhập đầy đủ ngày và giờ.'); return }
    if (slotForm.startTime >= slotForm.endTime) { setFormError('Giờ kết thúc phải sau giờ bắt đầu.'); return }
    setSubmitting(true)
    try {
      await expertConsoleApi.createSlot({ slot_date: slotForm.date, start_time: slotForm.startTime, end_time: slotForm.endTime })
      notify('Đã mở khung giờ tư vấn mới.')
      setCreating(false)
      await resource.reload()
      onMutate()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể tạo khung giờ.')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteSlot() {
    if (!deleting) return
    setSubmitting(true)
    try {
      await expertConsoleApi.deleteSlot(deleting.id)
      notify(`Đã xóa khung giờ ${formatTime(deleting.startTime)} ngày ${formatDate(deleting.date)}.`)
      setDeleting(null)
      await resource.reload()
      onMutate()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể xóa khung giờ. Có thể slot đã được đặt.', 'error')
      await resource.reload()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="expert-panel">
      <PanelHeading eyebrow="Thời gian khả dụng" title="Khung giờ tư vấn" description="Mở lịch trống mới và quản lý các slot chưa hoặc đã có người đặt." action={<button className="expert-button primary" type="button" onClick={() => setCreating(true)}><Plus size={17} /> Tạo khung giờ</button>} />
      <div className="expert-filters four">
        <label><span>Một ngày</span><input type="date" value={date} onChange={(event) => setParams({ slot_date: event.target.value || undefined, slot_from: undefined, slot_to: undefined })} /></label>
        <label><span>Từ ngày</span><input type="date" value={from} max={to || undefined} onChange={(event) => setParams({ slot_from: event.target.value || undefined, slot_date: undefined })} /></label>
        <label><span>Đến ngày</span><input type="date" value={to} min={from || undefined} onChange={(event) => setParams({ slot_to: event.target.value || undefined, slot_date: undefined })} /></label>
        <label><span>Trạng thái</span><select value={status} onChange={(event) => setParams({ slot_status: event.target.value || undefined })}><option value="">Tất cả</option><option value="OPEN">Còn trống</option><option value="BOOKED">Đã đặt</option></select></label>
      </div>
      <ResourceState loading={resource.loading} error={resource.error} empty={!resource.data?.length} onRetry={resource.reload}>
        <div className="expert-slot-list">
          {resource.data?.map((slot) => <article key={slot.id}>
            <span className="expert-slot-icon"><Clock size={20} weight="duotone" /></span>
            <div><strong>{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</strong><p>{formatDate(slot.date)}</p></div>
            <span className={`expert-badge ${slot.status.toLowerCase()}`}>{slot.status === 'OPEN' ? 'Còn trống' : 'Đã có người đặt'}</span>
            {slot.status === 'OPEN' ? <button className="expert-icon-button danger" type="button" aria-label={`Xóa khung giờ ${formatTime(slot.startTime)} ngày ${formatDate(slot.date)}`} title="Xóa khung giờ" onClick={() => setDeleting(slot)}><Trash size={18} /></button> : <span className="expert-slot-locked">Không thể xóa</span>}
          </article>)}
        </div>
      </ResourceState>
      {creating && <Dialog title="Tạo khung giờ mới" description="Khung giờ sẽ xuất hiện ngay trong lịch khả dụng của bạn." onClose={() => !submitting && setCreating(false)} actions={<><button className="expert-button secondary" type="button" disabled={submitting} onClick={() => setCreating(false)}>Hủy</button><button className="expert-button primary" type="button" disabled={submitting} onClick={() => void createSlot()}>{submitting ? 'Đang tạo…' : 'Tạo khung giờ'}</button></>}>
        <div className="expert-dialog-grid"><label className="expert-dialog-field full"><span>Ngày tư vấn</span><input type="date" min={todayIso()} value={slotForm.date} onChange={(event) => setSlotForm((current) => ({ ...current, date: event.target.value }))} /></label><label className="expert-dialog-field"><span>Bắt đầu</span><input type="time" value={slotForm.startTime} onChange={(event) => setSlotForm((current) => ({ ...current, startTime: event.target.value }))} /></label><label className="expert-dialog-field"><span>Kết thúc</span><input type="time" value={slotForm.endTime} onChange={(event) => setSlotForm((current) => ({ ...current, endTime: event.target.value }))} /></label></div>
        {formError && <p className="expert-inline-error">{formError}</p>}
      </Dialog>}
      {deleting && <Dialog title="Xóa khung giờ trống?" description={`${formatTime(deleting.startTime)}–${formatTime(deleting.endTime)}, ${formatDate(deleting.date)}. Thao tác này không thể hoàn tác.`} onClose={() => !submitting && setDeleting(null)} actions={<><button className="expert-button secondary" type="button" disabled={submitting} onClick={() => setDeleting(null)}>Giữ lại</button><button className="expert-button danger" type="button" disabled={submitting} onClick={() => void deleteSlot()}>{submitting ? 'Đang xóa…' : 'Xóa khung giờ'}</button></>} />}
    </section>
  )
}
