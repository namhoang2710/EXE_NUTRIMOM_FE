import { useFeatureAccess } from '@/features/payment/hooks/useFeatureAccess'
import { usePaymentCooldown } from '@/features/payment/hooks/usePaymentCooldown'
import { UpgradePrompt } from '@/features/payment/components/UpgradePrompt'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { Switch } from '@/components/ui/switch'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import type { MedicalRecord } from '@/types/domain'
import { calendarApi } from '../api/calendar-api'
import { medicalRecordReminderDefaults, medicalRecordReminderPayload, medicalRecordReminderTitle } from '../model/calendar-helpers'
import type { ReminderType } from '../model/calendar-types'

const formId = 'medical-record-reminder-form'
const types = [{ value: 'FOLLOW_UP', label: 'Tái khám' }, { value: 'ROUTINE_CHECKUP', label: 'Khám định kỳ' }, { value: 'CUSTOM', label: 'Nhắc nhở khác' }] as const

interface Props { open: boolean; records: MedicalRecord[]; initialRecordId?: string; onClose: () => void; onSaved: () => void }

export function MedicalRecordReminderDialog({ open, records, initialRecordId, onClose, onSaved }: Props) {
  const access = useFeatureAccess('CALENDAR_REMINDERS', open)
  const clearUpgrade = access.clearUpgrade
  const cooldown = usePaymentCooldown('calendar-reminders')
  const upgradeHint = access.upgrade ?? access.hint
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
  const suggestedTitle = medicalRecordReminderTitle(type, selected?.title ?? '')

  useEffect(() => {
    if (!open) return
    const nextId = initialRecordId || records[0]?.id || ''
    const record = records.find((item) => item.id === nextId)
    clearUpgrade(); setRecordId(nextId); setType('FOLLOW_UP'); setRemindEnabled(true); setRemindMinutes(1440); setTitle(''); setNote(''); setError('')
    setStartsAtLocal(record ? medicalRecordReminderDefaults(record.occurred_at).startsAtLocal : '')
  }, [initialRecordId, open, records, clearUpgrade])

  function chooseRecord(id: string) {
    setRecordId(id)
    const record = records.find((item) => item.id === id)
    if (record) setStartsAtLocal(medicalRecordReminderDefaults(record.occurred_at).startsAtLocal)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || gate.current || cooldown.blocked) return
    if (!startsAtLocal || new Date(startsAtLocal) <= new Date()) { setError('Thời gian bắt đầu phải ở tương lai.'); return }
    if (remindEnabled && (remindMinutes < 0 || remindMinutes > 10080)) { setError('Thời gian nhắc phải từ 0 đến 10080 phút.'); return }
    gate.current = true; setSaving(true); setError('')
    try {
      if (!await access.checkAccess()) return
      await calendarApi.createFromMedicalRecord(selected.id, medicalRecordReminderPayload({ type, recordTitle: selected.title, startsAtLocal, remindEnabled, remindMinutesBefore: remindMinutes, title, note }))
      onSaved()
    } catch (reason) { if (access.handleError(reason)) return; cooldown.handleRateLimit(reason); setError(reason instanceof Error ? reason.message : 'Không thể tạo lịch từ hồ sơ.') }
    finally { gate.current = false; setSaving(false) }
  }

  return <AccessibleDialog open={open} title="Thêm lịch nhắc nhở" description="Chọn hồ sơ và thời gian bạn muốn được nhắc." onClose={onClose} busy={saving} className="medical-record-reminder-dialog" footer={upgradeHint ? undefined : <><button className="secondary-button" type="button" disabled={saving} onClick={onClose}>Đóng</button><button className="primary-button" type="submit" form={formId} disabled={saving || !selected || cooldown.remaining > 0}>{cooldown.remaining > 0 ? `Thử lại sau ${cooldown.remaining}s` : saving ? 'Đang tạo...' : 'Tạo lịch nhắc'}</button></>}>
    {upgradeHint ? <UpgradePrompt hint={upgradeHint} onDismiss={access.upgrade && !access.hint ? clearUpgrade : onClose} /> : <form id={formId} className="calendar-reminder-form" onSubmit={submit} aria-busy={saving}>
      <fieldset disabled={saving} className="medical-record-reminder-fields">
        <AnimatedSelect label="Hồ sơ y tế" value={recordId} options={records.map((record) => ({ value: record.id, label: record.title }))} onValueChange={chooseRecord} />
        <AnimatedSelect label="Loại nhắc" value={type} options={types} onValueChange={setType} />
        <label>Thời gian bắt đầu<input required type="datetime-local" value={startsAtLocal} onChange={(event) => setStartsAtLocal(event.target.value)} /></label>
        <div className="calendar-toggle-row"><div><strong>Nhắc tôi</strong><small>Mặc định trước 1 ngày</small></div><Switch checked={remindEnabled} onCheckedChange={setRemindEnabled} aria-label="Nhắc tôi" /></div>
        {remindEnabled && <label>Số phút báo trước<input type="number" min="0" max="10080" value={remindMinutes} onChange={(event) => setRemindMinutes(Number(event.target.value))} /></label>}
        <label>Tên lịch nhắc <span>Không bắt buộc</span><input maxLength={255} value={title} placeholder={suggestedTitle} aria-describedby={`${formId}-title-hint`} onChange={(event) => setTitle(event.target.value)} /><small id={`${formId}-title-hint`}>Để trống để dùng tên gợi ý từ hồ sơ y tế</small></label>
        <label>Ghi chú <span>Không bắt buộc</span><textarea maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      </fieldset>
      {error && <p className="nm-dialog-error" role="alert">{error}</p>}
    </form>}
  </AccessibleDialog>
}
