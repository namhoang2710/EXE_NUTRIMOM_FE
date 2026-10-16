import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { calendarApi } from '../api/calendar-api'
import { calendarRangeError, localDate, visibleRange } from '../model/calendar-helpers'
import type { CalendarEventItem, CalendarMonthItem, CalendarSource, CalendarView, SharedCalendarMetadata } from '../model/calendar-types'
import { logDiagnostic } from '@/core/diagnostics/logger'

export function useCalendarData(enabled: boolean, view: CalendarView, anchor: Date, selectedDate: string, refreshToken: number, mode: 'owner' | 'shared' = 'owner', types: CalendarSource[] = []) {
  const [monthItems, setMonthItems] = useState<CalendarMonthItem[]>([])
  const [events, setEvents] = useState<CalendarEventItem[]>([])
  const [monthLoading, setMonthLoading] = useState(view === 'MONTH')
  const [eventsLoading, setEventsLoading] = useState(true)
  const [monthError, setMonthError] = useState('')
  const [eventsError, setEventsError] = useState('')
  const [sharedMetadata, setSharedMetadata] = useState<SharedCalendarMetadata>()
  const monthController = useRef<AbortController | undefined>(undefined)
  const eventsController = useRef<AbortController | undefined>(undefined)
  const range = useMemo(() => view === 'MONTH' ? { from: selectedDate, to: selectedDate } : visibleRange(view, anchor), [anchor, selectedDate, view])

  const loadMonth = useCallback(async () => {
    if (!enabled || view !== 'MONTH') return
    monthController.current?.abort()
    const controller = new AbortController()
    monthController.current = controller
    setMonthLoading(true); setMonthError('')
    try {
      if (mode === 'shared') {
        const result = await calendarApi.sharedMonth(anchor.getFullYear(), anchor.getMonth() + 1, controller.signal)
        if (!controller.signal.aborted) { setMonthItems(result.days); setSharedMetadata(result) }
      } else {
        const items = await calendarApi.month(anchor.getFullYear(), anchor.getMonth() + 1, controller.signal)
        if (!controller.signal.aborted) setMonthItems(items)
      }
      logDiagnostic({ level: 'info', category: mode === 'shared' ? 'shared-calendar' : 'calendar', event: 'month_loaded' })
    }
    catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'REQUEST_ABORTED') return
      if (mode === 'shared' && reason instanceof ApiClientError && reason.status === 403) setMonthItems([])
      setMonthError(calendarRangeError(reason)); logDiagnostic({ level: 'warn', category: mode === 'shared' ? 'shared-calendar' : 'calendar', event: 'month_load_failed', error_code: reason instanceof ApiClientError ? reason.code : undefined })
    } finally { if (!controller.signal.aborted) setMonthLoading(false) }
  }, [anchor, enabled, mode, view])

  const loadEvents = useCallback(async () => {
    if (!enabled) return
    eventsController.current?.abort()
    const controller = new AbortController()
    eventsController.current = controller
    setEventsLoading(true); setEventsError('')
    try {
      if (mode === 'shared') {
        const result = await calendarApi.sharedEvents(range.from, range.to, controller.signal, types)
        if (!controller.signal.aborted) { setEvents(result.events); setSharedMetadata(result) }
      } else {
        const items = await calendarApi.events(range.from, range.to, controller.signal, types)
        if (!controller.signal.aborted) setEvents(items)
      }
      logDiagnostic({ level: 'info', category: mode === 'shared' ? 'shared-calendar' : 'calendar', event: 'events_loaded' })
    }
    catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'REQUEST_ABORTED') return
      if (mode === 'shared' && reason instanceof ApiClientError && reason.status === 403) setEvents([])
      setEventsError(calendarRangeError(reason)); logDiagnostic({ level: 'warn', category: mode === 'shared' ? 'shared-calendar' : 'calendar', event: 'events_load_failed', error_code: reason instanceof ApiClientError ? reason.code : undefined })
    } finally { if (!controller.signal.aborted) setEventsLoading(false) }
  }, [enabled, mode, range.from, range.to, types])

  useEffect(() => {
    if (!enabled) { monthController.current?.abort(); setMonthLoading(false); setMonthError(''); return }
    void loadMonth()
    return () => monthController.current?.abort()
  }, [enabled, loadMonth, refreshToken])
  useEffect(() => {
    if (!enabled) { eventsController.current?.abort(); setEventsLoading(false); setEventsError(''); return }
    void loadEvents()
    return () => eventsController.current?.abort()
  }, [enabled, loadEvents, refreshToken])

  return { monthItems, events, monthLoading, eventsLoading, monthError, eventsError, sharedMetadata, range, retryMonth: loadMonth, retryEvents: loadEvents }
}

export function initialCalendarDate() { return localDate() }
