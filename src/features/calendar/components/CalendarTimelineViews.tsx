import { Fragment } from 'react'
import { Clock } from '@phosphor-icons/react'
import { calendarEventKey, formatEventTime, localDate, startOfWeek, addDays } from '../model/calendar-helpers'
import type { CalendarEventItem } from '../model/calendar-types'

const hours = Array.from({ length: 24 }, (_, hour) => hour)

interface TimelineProps {
  anchor: Date
  events: CalendarEventItem[]
  loading: boolean
  error: string
  onOpen: (event: CalendarEventItem) => void
  onRetry: () => void
}

function hourFor(event: CalendarEventItem) {
  const value = new Date(event.starts_at)
  return Number.isNaN(value.getTime()) ? -1 : value.getHours()
}

function HourEvent({ event, compact = false, onOpen }: { event: CalendarEventItem; compact?: boolean; onOpen: (event: CalendarEventItem) => void }) {
  return <button
    type="button"
    className={`calendar-timeline-event timeline-source-${event.source.toLowerCase()}${compact ? ' is-compact' : ''}`}
    data-event-key={calendarEventKey(event)}
    title={`${formatEventTime(event)} · ${event.title}`}
    onClick={() => onOpen(event)}
  >
    <span><Clock size={12} aria-hidden="true" />{formatEventTime(event)}</span>
    <strong>{event.title}</strong>
    {!compact && event.subtitle && <small>{event.subtitle}</small>}
  </button>
}

function TimelineFeedback({ loading, empty }: { loading: boolean; empty: boolean }) {
  if (loading) return <div className="calendar-timeline-feedback is-loading" role="status">Đang tải lịch…</div>
  if (empty) return <div className="calendar-timeline-feedback">Chưa có lịch trong khoảng thời gian này.</div>
  return null
}

function TimelineError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return <div className="calendar-state calendar-timeline-error"><strong>Chưa tải được lịch</strong><p>{error}</p><button className="secondary-button" type="button" onClick={onRetry}>Thử lại</button></div>
}

export function CalendarWeekView({ anchor, events, loading, error, onOpen, onRetry }: TimelineProps) {
  if (error) return <TimelineError error={error} onRetry={onRetry} />
  const weekStart = startOfWeek(anchor)
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  return <section className="calendar-timeline-shell" aria-busy={loading} aria-label="Lịch theo tuần">
    <TimelineFeedback loading={loading} empty={!events.length} />
    <div className="calendar-timeline-scroll">
      <div className="calendar-week-grid" role="grid">
        <div className="calendar-timeline-corner" role="columnheader">Giờ</div>
        {days.map((day) => <div className={`calendar-week-heading${localDate(day) === localDate() ? ' is-today' : ''}`} role="columnheader" key={localDate(day)}><strong>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(day)}</strong><span>{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(day)}</span></div>)}
        {hours.map((hour) => <Fragment key={hour}>
          <time className="calendar-timeline-hour" dateTime={`${String(hour).padStart(2, '0')}:00`}>{String(hour).padStart(2, '0')}:00</time>
          {days.map((day) => {
            const date = localDate(day)
            const hourEvents = events.filter((event) => event.date === date && hourFor(event) === hour)
            return <div className="calendar-week-cell" role="gridcell" key={`${date}-${hour}`}>{hourEvents.map((event) => <HourEvent compact event={event} key={calendarEventKey(event)} onOpen={onOpen} />)}</div>
          })}
        </Fragment>)}
      </div>
    </div>
  </section>
}

export function CalendarDayView({ anchor, events, loading, error, onOpen, onRetry }: TimelineProps) {
  if (error) return <TimelineError error={error} onRetry={onRetry} />
  const date = localDate(anchor)
  return <section className="calendar-timeline-shell" aria-busy={loading} aria-label={`Lịch ngày ${date}`}>
    <TimelineFeedback loading={loading} empty={!events.length} />
    <div className="calendar-timeline-scroll">
      <div className="calendar-day-grid" role="grid">
        {hours.map((hour) => {
          const hourEvents = events.filter((event) => event.date === date && hourFor(event) === hour)
          return <Fragment key={hour}>
            <time className="calendar-timeline-hour" dateTime={`${String(hour).padStart(2, '0')}:00`}>{String(hour).padStart(2, '0')}:00</time>
            <div className="calendar-day-cell" role="gridcell">{hourEvents.map((event) => <HourEvent event={event} key={calendarEventKey(event)} onOpen={onOpen} />)}</div>
          </Fragment>
        })}
      </div>
    </div>
  </section>
}
