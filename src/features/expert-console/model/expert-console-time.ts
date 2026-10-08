import {
  VIETNAM_TIME_ZONE,
  vietnamToday,
} from '../../consultation/model/slot-grid.ts'
import type { Consultation } from './expert-console-types.ts'

type VietnamDateTimeParts = {
  date: string
  hour: number
  minute: number
}

export function vietnamDateTimeParts(now = new Date()): VietnamDateTimeParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  }
}

export function vietnamTodayIso(now = new Date()): string {
  return vietnamToday(now)
}

function appointmentKey(consultation: Consultation) {
  return consultation.slot ? `${consultation.slot.date}T${consultation.slot.startTime}` : ''
}

/** Returns a new array with the latest appointment first and unscheduled rows last. */
export function sortConsultationsNewestFirst(items: readonly Consultation[]) {
  return items.map((item, index) => ({ item, index })).sort((left, right) => {
    const byAppointment = appointmentKey(right.item).localeCompare(appointmentKey(left.item))
    if (byAppointment !== 0) return byAppointment
    const byCreation = right.item.createdAt.localeCompare(left.item.createdAt)
    return byCreation !== 0 ? byCreation : left.index - right.index
  }).map(({ item }) => item)
}
