import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { consultationHorizon, datesInConsultationHorizon } from '../model/slot-grid'
import '../styles/slot-grid.css'

export interface DateStripSummary {
  openCount?: number
  bookedCount?: number
  dayOff?: boolean
}

interface DateStripProps {
  selectedDate: string
  onSelect(date: string): void
  summaries?: Record<string, DateStripSummary | undefined>
  disabled?: boolean
  now?: Date
}

const dayFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', month: 'short' })

function dateValue(date: string) {
  return new Date(`${date}T00:00:00+07:00`)
}

function summaryLabel(summary?: DateStripSummary) {
  if (!summary) return ''
  if (summary.dayOff) return 'Nghỉ'
  if ((summary.openCount ?? 0) > 0) return `${summary.openCount} trống`
  if ((summary.bookedCount ?? 0) > 0) return 'Đã kín'
  return 'Đã kín'
}

export function DateStrip({ selectedDate, onSelect, summaries = {}, disabled = false, now }: DateStripProps) {
  const reduceMotion = useReducedMotion()
  const dates = useMemo(() => datesInConsultationHorizon(now), [now])
  const selectedIndex = Math.max(0, dates.indexOf(selectedDate))
  const [page, setPage] = useState(() => Math.floor(selectedIndex / 7))
  const maxPage = Math.ceil(dates.length / 7) - 1
  const visibleDates = dates.slice(page * 7, page * 7 + 7)
  const { minDate, maxDate } = consultationHorizon(now)

  useEffect(() => setPage(Math.floor(selectedIndex / 7)), [selectedIndex])

  function movePage(direction: -1 | 1) {
    setPage((current) => Math.min(maxPage, Math.max(0, current + direction)))
  }

  return (
    <div className="consultation-date-strip" aria-label={`Chọn ngày từ ${minDate} đến ${maxDate}`}>
      <button className="consultation-date-strip__nav" type="button" disabled={disabled || page === 0} aria-label="Xem nhóm ngày trước" onClick={() => movePage(-1)}><CaretLeft size={18} weight="bold" /></button>
      <div className="consultation-date-strip__days">
        {visibleDates.map((date) => {
          const value = dateValue(date)
          const selected = date === selectedDate
          const summary = summaryLabel(summaries[date])
          return (
            <button key={date} type="button" disabled={disabled} aria-pressed={selected} aria-label={`${dayFormatter.format(value)}, ngày ${value.getDate()} ${monthFormatter.format(value)}${summary ? `, ${summary}` : ''}`} onClick={() => onSelect(date)}>
              {selected && <motion.span className="consultation-date-strip__selection" layoutId="consultation-date-selection" transition={{ duration: reduceMotion ? 0 : 0.18 }} />}
              <span className="consultation-date-strip__weekday">{dayFormatter.format(value)}</span>
              <strong>{Number(date.slice(8, 10))}</strong>
              <span className="consultation-date-strip__month">{monthFormatter.format(value)}</span>
              {summary && <small>{summary}</small>}
            </button>
          )
        })}
      </div>
      <button className="consultation-date-strip__nav" type="button" disabled={disabled || page === maxPage} aria-label="Xem nhóm ngày sau" onClick={() => movePage(1)}><CaretRight size={18} weight="bold" /></button>
      <label className="consultation-date-strip__picker">
        <span className="sr-only">Nhảy tới ngày</span>
        <input type="date" min={minDate} max={maxDate} value={selectedDate} disabled={disabled} onChange={(event) => {
          const next = event.target.value
          if (next >= minDate && next <= maxDate) onSelect(next)
        }} />
      </label>
    </div>
  )
}
