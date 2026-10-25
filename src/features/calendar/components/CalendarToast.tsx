import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { CALENDAR_TOAST_DURATION, scheduleCalendarToastDismiss } from '../model/calendar-action-feedback'

export interface CalendarToastMessage {
  id: number
  message: string
  tone: 'success' | 'error'
}

interface Props {
  toast?: CalendarToastMessage
  onClose: () => void
}

export { CALENDAR_TOAST_DURATION }

export function GlobalActionToast({ toast, onClose }: Props) {
  const reduceMotion = useReducedMotion()
  const visible = Boolean(toast)
  useLayoutEffect(() => {
    if (!visible) return
    let frame = 0
    const update = () => {
      frame = 0
      const headers = [...document.querySelectorAll('.nm-app-header, .admin-topbar, .expert-topbar, .landing-header')]
      const bottom = Math.max(0, ...headers.map(header => { const rect = header.getBoundingClientRect(); return rect.width && rect.top < 100 ? rect.bottom : 0 }))
      document.documentElement.style.setProperty('--nm-toast-top', `${Math.max(12, bottom + 12)}px`)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const observer = new ResizeObserver(schedule)
    document.querySelectorAll('.nm-app-header, .admin-topbar, .expert-topbar, .landing-header').forEach(header => observer.observe(header))
    window.addEventListener('resize', schedule); window.addEventListener('scroll', schedule, { passive: true })
    update()
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule); document.documentElement.style.removeProperty('--nm-toast-top') }
  }, [visible])

  useEffect(() => {
    if (!toast) return
    return scheduleCalendarToastDismiss(onClose)
  }, [onClose, toast])

  if (typeof document === 'undefined') return null

  return createPortal(<AnimatePresence initial={false}>
    {toast && <motion.aside
      key={toast.id}
      className={`calendar-action-toast is-${toast.tone}`}
      data-ui="global-action-toast"
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
      transition={{ duration: reduceMotion ? .08 : .22, ease: 'easeOut' }}
    >
      <span className="calendar-action-toast-icon" aria-hidden="true">{toast.tone === 'success' ? <CheckCircle size={22} weight="fill" /> : <WarningCircle size={22} weight="fill" />}</span>
      <p>{toast.message}</p>
      <button type="button" aria-label="Đóng thông báo" onClick={onClose}><X size={18} /></button>
      <span className="calendar-action-toast-progress" aria-hidden="true" />
    </motion.aside>}
  </AnimatePresence>, document.body)
}

export const CalendarToast = GlobalActionToast
