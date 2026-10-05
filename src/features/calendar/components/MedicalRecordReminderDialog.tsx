import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { Switch } from '@/components/ui/switch'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import type { MedicalRecord } from '@/types/domain'
import { calendarApi } from '../api/calendar-api'
import { medicalRecordReminderDefaults, medicalRecordReminderPayload } from '../model/calendar-helpers'
import type { ReminderType } from '../model/calendar-types'

const formId = 'medical-record-reminder-form'
const types = [{ value: 'FOLLOW_UP', label: 'Tái khám' }, { value: 'ROUTINE_CHECKUP', label: 'Khám định kỳ' }, { value: 'CUSTOM', label: 'Nhắc nhở khác' }] as const

interface Props { open: boolean; records: MedicalRecord[]; initialRecordId?: string; onClose: () => void; onSaved: () => void }

export function MedicalRecordReminderDialog({ open, records, initialRecordId, onClose, onSaved }: Props) {
  const [recordId, setRecordId] = useState(initialRecordId || records[0]?.id || '')
  const [type, setType] = useState<ReminderType>('FOLLOW_UP')
  const [startsAtLocal, setStartsAtLocal] = useState('')
  const [remindEnabled, setRemindEnabled] = useState(true)
  const [remindMinutes, setRemindMinutes] = useState(1440)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const gate = useRef(false)
  const selected = records.find((record) => record.id === recordId)

  useEffect(() => {
    if (!open) return
    const nextId = initialRecordId || records[0]?.id || ''
    const record = records.find((item) => item.id === nextId)
    setRecordId(nextId); setType('FOLLOW_UP'); setRemindEnabled(true); setRemindMinutes(1440); setTitle(''); setNote(''); setError('')
    setStartsAtLocal(record ? medicalRecordReminderDefaults(record.occurred_at).startsAtLocal : '')
  }, [initialRecordId, open, records])

  function chooseRecord(id: string) {
    setRecordId(id)
    const record = records.find((item) => item.id === id)
    if (record) setStartsAtLocal(medicalRecordReminderDefaults(record.occurred_at).startsAtLocal)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || gate.current) return
    if (!startsAtLocal || new Date(startsAtLocal) <= new Date()) { setError('Thời gian bắt đầu phải ở tương lai.'); return }
    if (remindEnabled && (remindMinutes < 0 || remindMinutes > 10080)) { setError('Thời gian nhắc phải từ 0 đến 10080 phút.'); return }
    gate.current = true; setSaving(true); setError('')
    try {
      await calendarApi.createFromMedicalRecord(selected.id, medicalRecordReminderPayload({ type, startsAtLocal, remindEnabled, remindMinutesBefore: remindMinutes, title, note }))
      onSaved()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tạo lịch từ hồ sơ.') }
    finally { gate.current = false; setSaving(false) }
  }

  return <AccessibleDialog open={open} title="Thêm lịch nhắc nhở" description="Cơ sở y tế, thai kỳ và tiêu đề mặc định sẽ được lấy an toàn từ hồ sơ." onClose={onClose} busy={saving} className="medical-record-reminder-dialog" footer={<><button className="secondary-button" type="button" disabled={saving} onClick={onClose}>Đóng</button><button className="primary-button" type="submit" form={formId} disabled={saving || !selected}>{saving ? 'Đang tạo...' : 'Tạo lịch nhắc'}</button></>}>
    <form id={formId} className="calendar-reminder-form" onSubmit={submit}>
      <AnimatedSelect label="Hồ sơ y tế" value={recordId} options={records.map((record) => ({ value: record.id, label: record.title }))} onValueChange={chooseRecord} />
      <AnimatedSelect label="Loại nhắc" value={type} options={types} onValueChange={setType} />
      <label>Thời gian bắt đầu<input required type="datetime-local" value={startsAtLocal} onChange={(event) => setStartsAtLocal(event.target.value)} /></label>
      <div className="calendar-toggle-row"><div><strong>Nhắc tôi</strong><small>Mặc định trước 1 ngày</small></div><Switch checked={remindEnabled} onCheckedChange={setRemindEnabled} aria-label="Nhắc tôi" /></div>
      {remindEnabled && <label>Số phút báo trước<input type="number" min="0" max="10080" value={remindMinutes} onChange={(event) => setRemindMinutes(Number(event.target.value))} /></label>}
      <label>Tiêu đề ghi đè <span>Không bắt buộc</span><input maxLength={255} value={title} placeholder="Để trống để backend tự tạo" onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Ghi chú <span>Không bắt buộc</span><textarea maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {error && <p className="nm-dialog-error" role="alert">{error}</p>}
    </form>
  </AccessibleDialog>
}
