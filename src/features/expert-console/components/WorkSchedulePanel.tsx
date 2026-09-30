import { CalendarX, Lock, WarningCircle } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { DateStrip, type DateStripSummary } from '@/features/consultation/components/DateStrip'
import { consultationHorizon, normalizeSlotTime, SLOT_START_TIMES, slotEndTime, vietnamToday } from '@/features/consultation/model/slot-grid'
import { expertConsoleApi } from '../api/expert-console-api'
import { useExpertResource } from '../hooks/useExpertResource'
import { expertActionErrorMessage, isExpertApiError } from '../model/expert-console-errors'
import type { DaySchedule, ScheduleSlot } from '../model/expert-console-types'
import { Dialog, PanelHeading } from './ExpertUI'

const groups = [
  { id: 'morning', label: 'Sáng', from: '08:00', to: '11:30' },
  { id: 'afternoon', label: 'Chiều', from: '12:00', to: '16:30' },
  { id: 'evening', label: 'Tối', from: '17:00', to: '19:30' },
] as const

function scheduleWithCompleteGrid(schedule: DaySchedule): DaySchedule {
  const byTime = new Map(schedule.slots.map((slot) => [normalizeSlotTime(slot.startTime), slot]))
  return {
    ...schedule,
    slots: SLOT_START_TIMES.map((startTime) => byTime.get(startTime) || {
      startTime,
      endTime: slotEndTime(startTime),
      state: 'CLOSED' as const,
      past: false,
      booking: null,
    }),
  }
}

function ScheduleSkeleton() {
  return <div className="expert-work-schedule-skeleton" aria-busy="true" aria-label="Đang tải lịch làm việc">
    <span className="day-off" />
    {SLOT_START_TIMES.map((time) => <span key={time} />)}
  </div>
}

export function WorkSchedulePanel({ search, setParams, notify, onMutate, refreshToken }: {
  search: URLSearchParams
  setParams: (values: Record<string, string | undefined>) => void
  notify: (message: string, tone?: 'success' | 'error') => void
  onMutate: () => Promise<void>
  refreshToken: number
}) {
  const { minDate, maxDate } = consultationHorizon()
  const requestedDate = search.get('slot_date') || vietnamToday()
  const selectedDate = requestedDate < minDate || requestedDate > maxDate ? minDate : requestedDate
  const reduceMotion = useReducedMotion()
  const [pendingSlots, setPendingSlots] = useState<Set<string>>(() => new Set())
  const [dayOffPending, setDayOffPending] = useState(false)
  const [confirmDayOff, setConfirmDayOff] = useState(false)

  const scheduleResource = useExpertResource(
    async (signal) => scheduleWithCompleteGrid(await expertConsoleApi.schedule(selectedDate, signal)),
    [selectedDate, refreshToken],
  )
  const summaryResource = useExpertResource(
    (signal) => expertConsoleApi.scheduleSummary(minDate, maxDate, signal),
    [minDate, maxDate, refreshToken],
  )
  const summaries = useMemo(() => Object.fromEntries((summaryResource.data || []).map((item): [string, DateStripSummary] => [item.date, {
    openCount: item.openCount,
    bookedCount: item.bookedCount,
    dayOff: item.dayOff,
  }])), [summaryResource.data])
  const schedule = scheduleResource.data

  function replaceSlot(next: ScheduleSlot) {
    scheduleResource.setData((current) => current ? { ...current, slots: current.slots.map((slot) => slot.startTime === next.startTime ? next : slot) } : current)
  }

  async function toggleSlot(slot: ScheduleSlot, checked: boolean) {
    if (!schedule || schedule.dayOff || slot.past || slot.state === 'BOOKED') return
    const key = `${schedule.date}|${slot.startTime}`
    if (pendingSlots.has(key)) return
    const original = slot
    const optimistic: ScheduleSlot = { ...slot, state: checked ? 'OPEN' : 'CLOSED' }
    setPendingSlots((current) => new Set(current).add(key))
    replaceSlot(optimistic)
    try {
      const saved = await expertConsoleApi.toggleSlot(schedule.date, slot.startTime, !checked)
      replaceSlot(saved)
      await Promise.allSettled([summaryResource.reload(), onMutate()])
      notify(checked ? `Đã mở khung giờ ${slot.startTime}.` : `Đã đóng khung giờ ${slot.startTime}.`)
    } catch (error) {
      replaceSlot(original)
      const message = expertActionErrorMessage(error, 'Không thể cập nhật khung giờ. Vui lòng thử lại.')
      notify(message, 'error')
      if (isExpertApiError(error, 'SLOT_UNAVAILABLE')) await scheduleResource.reload()
    } finally {
      setPendingSlots((current) => { const next = new Set(current); next.delete(key); return next })
    }
  }

  async function saveDayOff(dayOff: boolean) {
    if (!schedule || dayOffPending) return
    setDayOffPending(true)
    try {
      const saved = await expertConsoleApi.toggleDayOff(schedule.date, dayOff)
      scheduleResource.setData(scheduleWithCompleteGrid(saved))
      await Promise.allSettled([summaryResource.reload(), onMutate()])
      notify(dayOff ? 'Đã bật chế độ nghỉ cả ngày.' : 'Đã mở lại lịch làm việc trong ngày.')
      setConfirmDayOff(false)
    } catch (error) {
      notify(expertActionErrorMessage(error, 'Không thể cập nhật chế độ nghỉ cả ngày.'), 'error')
    } finally {
      setDayOffPending(false)
    }
  }

  function changeDayOff(checked: boolean) {
    if (checked) setConfirmDayOff(true)
    else void saveDayOff(false)
  }

  function openBooking(slot: ScheduleSlot) {
    if (!slot.booking) return
    setParams({
      section: 'requests',
      request_type: undefined,
      request_q: slot.booking.userDisplayName || undefined,
      request_focus: slot.booking.requestId,
      request_page: undefined,
    })
  }

  return (
    <section className="expert-panel expert-work-schedule">
      <PanelHeading eyebrow="Thời gian khả dụng" title="Lịch làm việc" description="Mặc định mở 24 khung giờ mỗi ngày. Đóng những giờ bận hoặc bật nghỉ cả ngày khi cần." />
      <div className="expert-work-schedule__dates">
        <DateStrip selectedDate={selectedDate} summaries={summaries} disabled={dayOffPending} onSelect={(date) => setParams({ slot_date: date === minDate ? undefined : date })} />
        {summaryResource.error && <p className="expert-inline-error" role="alert">Không thể tải tổng hợp lịch. <button type="button" onClick={() => void summaryResource.reload()}>Thử lại</button></p>}
      </div>

      {scheduleResource.loading ? <ScheduleSkeleton /> : scheduleResource.error ? (
        <div className="expert-state"><WarningCircle size={28} weight="duotone" /><h3>Chưa thể tải lịch làm việc</h3><p>{scheduleResource.error}</p><button className="expert-button secondary" type="button" onClick={() => void scheduleResource.reload()}>Thử lại</button></div>
      ) : !schedule ? (
        <div className="expert-state"><CalendarX size={28} weight="duotone" /><h3>Chưa có dữ liệu lịch</h3><p>Vui lòng thử tải lại lịch làm việc.</p></div>
      ) : <>
        <div className="expert-day-off-control">
          <Field orientation="horizontal" data-disabled={dayOffPending || undefined}>
            <FieldContent>
              <FieldLabel htmlFor={`day-off-${schedule.date}`}><FieldTitle>Nghỉ cả ngày</FieldTitle></FieldLabel>
              <FieldDescription>Chặn booking mới nhưng vẫn giữ nguyên các lịch đã đặt và các khung giờ từng đóng.</FieldDescription>
            </FieldContent>
            <Switch id={`day-off-${schedule.date}`} checked={schedule.dayOff} disabled={dayOffPending} aria-label={`Nghỉ cả ngày ${schedule.date}`} onCheckedChange={changeDayOff} />
          </Field>
        </div>

        {schedule.dayOff && <div className="expert-day-off-guidance" role="status">Đang nghỉ cả ngày. Tắt chế độ nghỉ để mở lại từng khung giờ.</div>}

        <div className="expert-schedule-legend" aria-label="Chú thích trạng thái">
          <span data-state="open">Đang mở</span><span data-state="closed">Đã đóng</span><span data-state="booked">Đã đặt</span><span data-state="past">Đã qua</span>
        </div>

        <div className="expert-schedule-groups">
          {groups.map((group) => {
            const slots = schedule.slots.filter((slot) => slot.startTime >= group.from && slot.startTime <= group.to)
            return <section key={group.id} className="expert-schedule-group" aria-labelledby={`schedule-${group.id}`}>
              <header><h3 id={`schedule-${group.id}`}>{group.label}</h3><span>{group.from} - {slotEndTime(group.to)}</span></header>
              <div className="expert-schedule-slot-grid">
                {slots.map((slot) => {
                  const key = `${schedule.date}|${slot.startTime}`
                  const pending = pendingSlots.has(key)
                  const past = slot.past
                  const state = past ? 'past' : slot.state.toLowerCase()
                  const disabled = dayOffPending || pending || schedule.dayOff || past
                  return <motion.article key={slot.startTime} data-state={state} data-day-off={schedule.dayOff && slot.state !== 'BOOKED' ? 'true' : undefined} animate={reduceMotion ? undefined : { opacity: pending ? .68 : 1, scale: pending ? .995 : 1 }} transition={{ duration: reduceMotion ? 0 : .18 }}>
                    {slot.state === 'BOOKED' ? <div className="expert-booked-slot">
                      <Lock size={18} weight="fill" aria-hidden="true" />
                      <div><strong>{slot.startTime} - {slot.endTime}</strong><span>Đã đặt</span>
                        {slot.booking && <button type="button" onClick={() => openBooking(slot)}>{slot.booking.userDisplayName || 'Người dùng'}</button>}
                      </div>
                    </div> : <Field orientation="horizontal" data-disabled={disabled || undefined}>
                      <FieldContent>
                        <FieldLabel htmlFor={`slot-${schedule.date}-${slot.startTime.replace(':', '')}`}><FieldTitle>{slot.startTime} - {slot.endTime}</FieldTitle></FieldLabel>
                        <FieldDescription>{past ? 'Đã qua' : slot.state === 'OPEN' ? 'Đang mở cho đặt lịch' : 'Đã đóng'}</FieldDescription>
                      </FieldContent>
                      <Switch
                        id={`slot-${schedule.date}-${slot.startTime.replace(':', '')}`}
                        checked={slot.state === 'OPEN'}
                        disabled={disabled}
                        aria-label={`${slot.state === 'OPEN' ? 'Đóng' : 'Mở'} khung giờ ${slot.startTime} ngày ${schedule.date}`}
                        onCheckedChange={(checked) => void toggleSlot(slot, checked)}
                      />
                    </Field>}
                  </motion.article>
                })}
              </div>
            </section>
          })}
        </div>
      </>}

      {confirmDayOff && schedule && <Dialog
        title="Bật nghỉ cả ngày?"
        description={schedule.hasBookings ? 'Ngày này đang có lịch đã đặt. Các lịch đó vẫn được giữ, chế độ nghỉ chỉ chặn booking mới.' : 'Chế độ nghỉ sẽ chặn booking mới trong ngày này.'}
        busy={dayOffPending}
        onClose={() => setConfirmDayOff(false)}
        actions={<><button className="expert-button secondary" type="button" disabled={dayOffPending} onClick={() => setConfirmDayOff(false)}>Quay lại</button><button className="expert-button primary" type="button" disabled={dayOffPending} onClick={() => void saveDayOff(true)}>{dayOffPending ? 'Đang cập nhật...' : 'Xác nhận nghỉ'}</button></>}
      >
        {schedule.hasBookings && <p className="expert-day-off-warning" role="status"><WarningCircle size={19} weight="fill" /> Các lịch đã đặt vẫn hiển thị và không bị hủy.</p>}
      </Dialog>}
    </section>
  )
}
