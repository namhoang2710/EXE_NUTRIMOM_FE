import { Popover } from '@base-ui/react/popover'
import { CalendarBlank } from '@phosphor-icons/react'
import { useId, useState, type ChangeEvent, type RefObject } from 'react'
import { vi } from 'date-fns/locale'
import type { DropdownProps } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { AdminDropdown } from './AdminDropdown'
import { adminCalendarDate, adminCalendarLabel } from '../model/admin-calendar-date'
import { vietnamToday } from '../model/admin-workspace-query'

function CalendarDropdown({ options = [], value, onChange, 'aria-label': label }: DropdownProps) {
  return <AdminDropdown className="admin-calendar-caption" label={label || 'Chọn tháng/năm'} value={String(value)} options={options.map((o) => ({ ...o, value: String(o.value) }))} onChange={(next) => onChange?.({ target: { value: next } } as ChangeEvent<HTMLSelectElement>)} />
}

export function AdminDatePicker({ label, value, onChange, future = false, minDate, maxDate, invalid, describedBy, buttonRef }: {
  label: string; value: string; onChange: (value: string) => void; future?: boolean; minDate?: string|null; maxDate?:string; invalid?: boolean; describedBy?: string; buttonRef?: RefObject<HTMLButtonElement | null>
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const today = adminCalendarDate(vietnamToday())!
  const maximum = maxDate ? adminCalendarDate(maxDate) : future ? undefined : today
  return <div className="admin-dropdown admin-date-picker">
    <span id={`${id}-label`}>{label}</span>
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger ref={buttonRef} className="admin-dropdown-trigger admin-date-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-invalid={invalid} aria-describedby={describedBy}>
        <span id={`${id}-value`}>{adminCalendarLabel(value)}</span><CalendarBlank size={18} aria-hidden />
      </Popover.Trigger>
      <Popover.Portal><Popover.Positioner className="admin-date-positioner" side="bottom" align="start" sideOffset={7}>
        <Popover.Popup className="admin-date-popup" aria-label={`Chọn ${label.toLowerCase()}`}>
          <Calendar mode="single" selected={adminCalendarDate(value)} onSelect={(date) => { onChange(date ? vietnamToday(date) : ''); setOpen(false) }} defaultMonth={adminCalendarDate(value) || today} today={today} timeZone="Asia/Ho_Chi_Minh" locale={vi} captionLayout="dropdown" startMonth={adminCalendarDate(minDate || '1900-01-01')} endMonth={maximum ?? adminCalendarDate('2100-12-01')} disabled={[...(minDate?[{before:adminCalendarDate(minDate)!}]:[]),...(maximum?[{after:maximum}]:[])]} className="rounded-lg border admin-calendar" components={{ Dropdown: CalendarDropdown }} />
          <div className="admin-calendar-footer"><button type="button" onClick={() => { onChange(''); setOpen(false) }}>Xóa ngày</button><Popover.Close>Đóng</Popover.Close></div>
        </Popover.Popup>
      </Popover.Positioner></Popover.Portal>
    </Popover.Root>
  </div>
}
