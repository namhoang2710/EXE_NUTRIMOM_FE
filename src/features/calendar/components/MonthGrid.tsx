import { motion, useReducedMotion } from 'motion/react'
import { localDate } from '../model/calendar-helpers'
import type { CalendarMonthItem } from '../model/calendar-types'

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

interface Props { anchor: Date; selectedDate: string; items: CalendarMonthItem[]; loading: boolean; onSelect: (date: string) => void }

export function MonthGrid({ anchor, selectedDate, items, loading, onSelect }: Props) {
  const reduceMotion = useReducedMotion()
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first); start.setDate(first.getDate() - offset)
  const summary = new Map(items.map((item) => [item.date, item]))
  const cells = Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date })
  const today = localDate()
  return <motion.div className={`calendar-month-grid${loading ? ' is-loading' : ''}`} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
    {weekdays.map((day) => <span className="calendar-grid-weekday" key={day}>{day}</span>)}
    {cells.map((date) => {
      const iso = localDate(date); const day = summary.get(iso); const outside = date.getMonth() !== anchor.getMonth()
      return <button type="button" className={`${outside ? 'is-outside ' : ''}${selectedDate === iso ? 'is-selected ' : ''}${today === iso ? 'is-today' : ''}`} key={iso} aria-pressed={selectedDate === iso} aria-label={`${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(date)}${day ? `, ${day.event_count} sự kiện` : ''}`} onClick={() => onSelect(iso)}><time dateTime={iso}>{date.getDate()}</time>{day && <span className="calendar-day-dots" aria-hidden="true">{day.types.map((type) => <i className={`source-${type.toLowerCase()}`} key={type} />)}{day.event_count > 3 && <small>{day.event_count}</small>}</span>}</button>
    })}
  </motion.div>
}
