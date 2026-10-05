import { ArrowSquareOut, CheckCircle, Clock, MapPin, Repeat } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { calendarEventKey, calendarStatusLabel, formatEventTime, isCalendarStatusComplete } from '../model/calendar-helpers'
import type { CalendarEventItem } from '../model/calendar-types'

const sourceLabels = { MEDICAL_RECORD: 'Hồ sơ y tế', CONSULTATION: 'Tư vấn', REMINDER: 'Nhắc nhở' }

interface Props { event: CalendarEventItem; onOpen: (event: CalendarEventItem) => void }

export function CalendarEventCard({ event, onOpen }: Props) {
  const reduceMotion = useReducedMotion()
  const statusLabel = calendarStatusLabel(event.status)
  const isComplete = isCalendarStatusComplete(event.status)
  return <motion.button layout={!reduceMotion} type="button" className={`calendar-event-card source-${event.source.toLowerCase()}`} data-event-key={calendarEventKey(event)} onClick={() => onOpen(event)} whileHover={reduceMotion ? undefined : { y: -2 }} transition={{ duration: reduceMotion ? 0 : .18 }}>
    <span className="calendar-event-time"><Clock size={14} />{formatEventTime(event)}</span>
    <strong>{event.title}</strong>
    {event.subtitle && <span><MapPin size={14} />{event.subtitle}</span>}
    <span className="calendar-event-meta">{sourceLabels[event.source]}{event.recurring && <><Repeat size={14} />Lặp lại</>}{statusLabel && <span className={`calendar-status-badge is-${event.status?.toLowerCase()}`}>{isComplete && <CheckCircle size={14} weight="fill" />}{statusLabel}</span>}</span>
    <ArrowSquareOut className="calendar-event-open" size={16} aria-hidden="true" />
  </motion.button>
}
