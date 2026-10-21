import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
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
