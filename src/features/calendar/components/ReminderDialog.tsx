import { Plus, X } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { Switch } from '@/components/ui/switch'
import { ApiClientError } from '@/core/api/api-error'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { CalendarDatePicker } from '@/shared/components/CalendarDatePicker'
import { calendarApi } from '../api/calendar-api'
import { formatCalendarDate, localDate, nextWeeklyAnchor, reminderCreatePayload, reminderPatchPayload, toLocalDateTimeValue, validateReminderForm } from '../model/calendar-helpers'
import type { ReminderDetail, ReminderFormValue, ReminderType, Weekday } from '../model/calendar-types'

const formId = 'calendar-reminder-form'
const reminderTypes = [
  { value: 'FOLLOW_UP', label: 'Tái khám' },
  { value: 'ROUTINE_CHECKUP', label: 'Khám định kỳ' },
  { value: 'CUSTOM', label: 'Nhắc nhở khác' },
] as const
const repeatModes = [
  { value: 'NONE', label: 'Không lặp' },
  { value: 'DAILY', label: 'Hằng ngày' },
  { value: 'EVERY_N_DAYS', label: 'Cách N ngày' },
  { value: 'WEEKLY', label: 'Theo thứ' },
  { value: 'MONTHLY', label: 'Hằng tháng' },
] as const
const weekdays: Array<{ value: Weekday; label: string }> = [
  { value: 'MONDAY', label: 'T2' }, { value: 'TUESDAY', label: 'T3' }, { value: 'WEDNESDAY', label: 'T4' },
  { value: 'THURSDAY', label: 'T5' }, { value: 'FRIDAY', label: 'T6' }, { value: 'SATURDAY', label: 'T7' }, { value: 'SUNDAY', label: 'CN' },
]
const reminderPresets = [{ value: 0, label: 'Đúng giờ' }, { value: 10, label: '10 phút' }, { value: 30, label: '30 phút' }, { value: 60, label: '1 giờ' }, { value: 1440, label: '1 ngày' }, { value: 10080, label: '7 ngày' }]

function futureLocalDateTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0)
  return toLocalDateTimeValue(date.toISOString())
}

function repeatMode(detail?: ReminderDetail): ReminderFormValue['repeatMode'] {
  if (!detail?.repeat) return 'NONE'
  if (detail.repeat.rule === 'WEEKLY') return 'WEEKLY'
  if (detail.repeat.rule === 'MONTHLY') return 'MONTHLY'
  return (detail.repeat.interval || 1) > 1 ? 'EVERY_N_DAYS' : 'DAILY'
}

function formValue(detail?: ReminderDetail, dueDate?: string): ReminderFormValue {
  const type = detail?.type || 'CUSTOM'
  return {
    type,
    title: detail?.title || '',
    startsAtLocal: toLocalDateTimeValue(detail?.starts_at) || futureLocalDateTime(),
    facilityName: detail?.facility_name || '',
    note: detail?.note || '',
    remindEnabled: detail ? detail.remind_minutes_before !== undefined : true,
    remindMinutesBefore: detail?.remind_minutes_before ?? (type === 'CUSTOM' ? 10 : 1440),
    repeatMode: repeatMode(detail),
    interval: detail?.repeat?.interval || 1,
    daysOfWeek: detail?.repeat?.days_of_week || [],
    timesOfDay: detail?.repeat?.times_of_day || [],
    until: detail?.repeat?.until || dueDate || '',
  }
}

interface Props {
  open: boolean
  detail?: ReminderDetail
  pregnancyId?: string
  estimatedDueDate?: string
  onClose: () => void
  onSaved: (detail: ReminderDetail) => void
  onConflict?: (detail: ReminderDetail) => void
}

export function ReminderDialog({ open, detail, pregnancyId, estimatedDueDate, onClose, onSaved, onConflict }: Props) {
  const [value, setValue] = useState<ReminderFormValue>(() => formValue(detail, estimatedDueDate))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submitGate = useRef(false)
  useEffect(() => { if (open) { setValue(formValue(detail, estimatedDueDate)); setErrors({}); setError('') } }, [detail, estimatedDueDate, open])

  const anchoredStart = value.repeatMode === 'WEEKLY' ? nextWeeklyAnchor(value.startsAtLocal, value.daysOfWeek) : value.startsAtLocal
  const preview = useMemo(() => {
    const date = new Date(anchoredStart)
    return formatCalendarDate(date, true)
  }, [anchoredStart])

  function patch(next: Partial<ReminderFormValue>) { setValue((current) => ({ ...current, ...next })) }
  function changeType(type: ReminderType) { patch({ type, remindMinutesBefore: type === 'CUSTOM' ? 10 : 1440 }) }
  function toggleDay(day: Weekday) { patch({ daysOfWeek: value.daysOfWeek.includes(day) ? value.daysOfWeek.filter((item) => item !== day) : [...value.daysOfWeek, day] }) }
  function addTime() { if (value.timesOfDay.length < 6) patch({ timesOfDay: [...value.timesOfDay, value.startsAtLocal.slice(11, 16) || '09:00'] }) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitGate.current) return
    const validation = validateReminderForm(value, new Date(), detail?.starts_at)
    if (Object.keys(validation).length) { setErrors(validation); return }
    submitGate.current = true; setSaving(true); setError(''); setErrors({})
    try {
      const saved = detail
        ? await calendarApi.updateReminder(detail.id, reminderPatchPayload(value, detail))
        : await calendarApi.createReminder(reminderCreatePayload(value, pregnancyId))
      onSaved(saved)
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT' && detail) {
        setError('Dữ liệu đã thay đổi, vui lòng tải lại.')
        try { const latest = await calendarApi.reminder(detail.id); onConflict?.(latest) } catch { /* Keep the conflict visible if refresh also fails. */ }
      } else {
        if (reason instanceof ApiClientError) setErrors(reason.fields)
        setError(reason instanceof Error ? reason.message : 'Không thể lưu lịch nhắc nhở.')
      }
    } finally { submitGate.current = false; setSaving(false) }
  }

  return <AccessibleDialog open={open} title={detail ? 'Sửa lịch nhắc nhở' : 'Thêm lịch nhắc nhở'} description="Lịch này chỉ thuộc tài khoản đang đăng nhập." onClose={onClose} busy={saving} className="calendar-reminder-dialog" footer={<><button className="secondary-button" type="button" disabled={saving} onClick={onClose}>Hủy</button><button className="primary-button" type="submit" form={formId} disabled={saving}>{saving ? 'Đang lưu...' : detail ? 'Lưu thay đổi' : 'Tạo lịch nhắc'}</button></>}>
    <form id={formId} className="calendar-reminder-form" onSubmit={submit} noValidate>
      <AnimatedSelect label="Loại nhắc" value={value.type} options={reminderTypes} onValueChange={changeType} />
      <label>Tiêu đề <span>{value.title.length}/255</span><input value={value.title} maxLength={255} onChange={(event) => patch({ title: event.target.value })} aria-invalid={Boolean(errors.title)} />{errors.title && <small role="alert">{errors.title}</small>}</label>
      <label>Thời gian bắt đầu<input type="datetime-local" min={detail ? undefined : `${localDate()}T00:00`} value={value.startsAtLocal} onChange={(event) => patch({ startsAtLocal: event.target.value })} aria-invalid={Boolean(errors.starts_at)} />{errors.starts_at && <small role="alert">{errors.starts_at}</small>}</label>
      <label>Cơ sở y tế <span>{value.facilityName.length}/255</span><input value={value.facilityName} maxLength={255} onChange={(event) => patch({ facilityName: event.target.value })} />{errors.facility_name && <small role="alert">{errors.facility_name}</small>}</label>
      <label>Ghi chú <span>{value.note.length}/2000</span><textarea value={value.note} maxLength={2000} onChange={(event) => patch({ note: event.target.value })} />{errors.note && <small role="alert">{errors.note}</small>}</label>
      <section className="calendar-form-section"><div className="calendar-toggle-row"><div><strong>Nhắc tôi</strong><small>Gửi thông báo trước mốc lịch</small></div><Switch checked={value.remindEnabled} onCheckedChange={(checked) => patch({ remindEnabled: checked })} aria-label="Nhắc tôi" /></div>{value.remindEnabled && <><div className="calendar-preset-row">{reminderPresets.map((preset) => <button type="button" className={value.remindMinutesBefore === preset.value ? 'is-active' : ''} key={preset.value} onClick={() => patch({ remindMinutesBefore: preset.value })}>{preset.label}</button>)}</div><label>Số phút báo trước<input type="number" min="0" max="10080" value={value.remindMinutesBefore} onChange={(event) => patch({ remindMinutesBefore: Number(event.target.value) })} /></label>{errors.remind_minutes_before && <small role="alert">{errors.remind_minutes_before}</small>}</>}</section>
      <section className="calendar-form-section"><AnimatedSelect label="Lặp lại" value={value.repeatMode} options={repeatModes} onValueChange={(mode) => patch({ repeatMode: mode })} />
        {value.repeatMode !== 'NONE' && <div className="calendar-repeat-fields">{(value.repeatMode === 'EVERY_N_DAYS' || value.repeatMode === 'WEEKLY') && <label>Chu kỳ lặp<input type="number" min="1" max="365" value={value.interval} onChange={(event) => patch({ interval: Number(event.target.value) })} /></label>}{errors.interval && <small role="alert">{errors.interval}</small>}
          {value.repeatMode === 'WEEKLY' && <fieldset><legend>Chọn thứ</legend><div className="calendar-weekdays">{weekdays.map((day) => <button type="button" aria-pressed={value.daysOfWeek.includes(day.value)} key={day.value} onClick={() => toggleDay(day.value)}>{day.label}</button>)}</div>{errors.days_of_week && <small role="alert">{errors.days_of_week}</small>}</fieldset>}
          <fieldset><legend>Các giờ trong ngày (tối đa 6)</legend><div className="calendar-times">{value.timesOfDay.map((time, index) => <span key={`${index}-${time}`}><input type="time" value={time} onChange={(event) => patch({ timesOfDay: value.timesOfDay.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} /><button type="button" aria-label={`Xóa mốc giờ ${time}`} onClick={() => patch({ timesOfDay: value.timesOfDay.filter((_, itemIndex) => itemIndex !== index) })}><X size={15} /></button></span>)}<button type="button" disabled={value.timesOfDay.length >= 6} onClick={addTime}><Plus size={15} />Thêm giờ</button></div>{errors.times_of_day && <small role="alert">{errors.times_of_day}</small>}</fieldset>
          <div className="calendar-until"><CalendarDatePicker label="Kết thúc vào ngày" value={value.until} min={value.startsAtLocal.slice(0, 10) || localDate()} max="2100-12-31" yearsBack={0} allowClear onChange={(until) => patch({ until })} error={errors.until} /><small>Để trống nếu không bao giờ kết thúc.</small></div>
        </div>}
      </section>
      {preview && <p className="calendar-first-preview"><strong>Lần nhắc đầu tiên:</strong> {preview}</p>}
      {error && <p className="nm-dialog-error" role="alert">{error}</p>}
    </form>
  </AccessibleDialog>
}
