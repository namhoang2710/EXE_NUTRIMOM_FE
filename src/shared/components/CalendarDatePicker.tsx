import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import { formatDate, todayDate } from '@/core/auth/date'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  max?: string
  allowClear?: boolean
  yearsBack?: number
}

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function CalendarDatePicker({ label, value, onChange, error, max = todayDate(), allowClear = false, yearsBack = 5 }: Props) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => {
    const date = value ? new Date(`${value}T12:00:00`) : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  useEffect(() => {
    if (error) (root.current?.querySelector('.calendar-trigger') as HTMLButtonElement | null)?.focus()
  }, [error])

  const firstWeekday = (month.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: firstWeekday + days }, (_, index) => index - firstWeekday + 1)
  const maxMonth = new Date(`${max}T12:00:00`)

  return <div className="field-group calendar-field" ref={root}>
    <span id={`${id}-label`} className="field-label">{label}</span>
    <button type="button" className={`calendar-trigger${error ? ' has-error' : ''}`} aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-calendar`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onClick={() => setOpen((current) => !current)}>
      <span id={`${id}-value`} className={value ? '' : 'calendar-placeholder'}>{value ? formatDate(value) : 'Chọn ngày'}</span><CalendarBlank size={20} aria-hidden="true" />
    </button>
    {error && <small id={`${id}-error`} className="calendar-error" role="alert">{error}</small>}
    {open && <div id={`${id}-calendar`} className="calendar-popup" onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); (root.current?.querySelector('.calendar-trigger') as HTMLButtonElement)?.focus() } }}>
      <div className="calendar-header"><button type="button" aria-label="Tháng trước" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><CaretLeft size={18} /></button><div className="calendar-month-year"><select aria-label="Chọn tháng" value={month.getMonth()} onChange={(event) => setMonth(new Date(month.getFullYear(), Number(event.target.value), 1))}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index} disabled={month.getFullYear() === maxMonth.getFullYear() && index > maxMonth.getMonth()}>Tháng {index + 1}</option>)}</select><select aria-label="Chọn năm" value={month.getFullYear()} onChange={(event) => { const year = Number(event.target.value); setMonth(new Date(year, Math.min(month.getMonth(), year === maxMonth.getFullYear() ? maxMonth.getMonth() : 11), 1)) }}>{Array.from({ length: yearsBack + 1 }, (_, index) => maxMonth.getFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}</select></div><button type="button" aria-label="Tháng sau" disabled={month.getFullYear() === maxMonth.getFullYear() && month.getMonth() >= maxMonth.getMonth()} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><CaretRight size={18} /></button></div>
      <div className="calendar-grid">{weekdays.map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}{cells.map((day, index) => day > 0 ? <button type="button" key={index} className={iso(new Date(month.getFullYear(), month.getMonth(), day)) === value ? 'selected' : ''} disabled={iso(new Date(month.getFullYear(), month.getMonth(), day)) > max} aria-label={new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date(month.getFullYear(), month.getMonth(), day))} aria-pressed={iso(new Date(month.getFullYear(), month.getMonth(), day)) === value} onClick={() => { onChange(iso(new Date(month.getFullYear(), month.getMonth(), day))); setOpen(false) }}>{day}</button> : <span key={index} />)}</div>
      <button type="button" className="calendar-today" onClick={() => { onChange(max); setMonth(new Date(`${max}T12:00:00`)); setOpen(false) }}>Chọn hôm nay</button>
      {allowClear && value && <button type="button" className="calendar-today" onClick={() => { onChange(''); setOpen(false) }}>Xóa ngày đã chọn</button>}
    </div>}
  </div>
}
