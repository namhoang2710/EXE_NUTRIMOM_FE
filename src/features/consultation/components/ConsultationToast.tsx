import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

export interface ConsultationToastState {
  id: number
  message: string
  tone: 'success' | 'error'
}

export function ConsultationToast({ toast, onClose }: { toast: ConsultationToastState | null; onClose: () => void }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="consultation-toast-region" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className={`consultation-toast is-${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            initial={reduceMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            {toast.tone === 'success' ? <CheckCircle size={22} weight="fill" aria-hidden="true" /> : <WarningCircle size={22} weight="fill" aria-hidden="true" />}
            <span>{toast.message}</span>
            <button type="button" onClick={onClose} aria-label="Đóng thông báo"><X size={18} aria-hidden="true" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
