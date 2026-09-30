import { ArrowLeft, ArrowRight, CalendarBlank, CalendarX, CaretDown, CheckCircle, WarningCircle, X } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type KeyboardEvent, type PropsWithChildren, type ReactNode, type RefObject, useEffect, useId, useRef, useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'

export function ResourceState({ loading, error, empty, onRetry, emptyTitle, emptyMessage, children }: PropsWithChildren<{
  loading: boolean
  error: string
  empty: boolean
  onRetry: () => void
  emptyTitle?: string
  emptyMessage?: string
}>) {
  if (loading) return <div className="expert-skeleton" aria-label="Đang tải dữ liệu"><span /><span /><span /></div>
  if (error) return <div className="expert-state"><WarningCircle size={28} weight="duotone" /><h3>Chưa thể tải dữ liệu</h3><p>{error}</p><button className="expert-button secondary" type="button" onClick={onRetry}>Thử lại</button></div>
  if (empty) return <div className="expert-state"><CalendarX size={28} weight="duotone" /><h3>{emptyTitle || 'Chưa có dữ liệu phù hợp'}</h3><p>{emptyMessage || 'Hãy thay đổi bộ lọc hoặc quay lại sau.'}</p></div>
  return children
}

export function Pagination({ page, totalPages, totalItems, onChange }: {
  page: number
  totalPages: number
  totalItems: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return totalItems > 0 ? <p className="expert-result-count">{totalItems} kết quả</p> : null
  return (
    <nav className="expert-pagination" aria-label="Phân trang">
      <p>{totalItems} kết quả · Trang {page}/{totalPages}</p>
      <div>
        <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1)}><ArrowLeft size={17} /></button>
        <button type="button" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => onChange(page + 1)}><ArrowRight size={17} /></button>
      </div>
    </nav>
  )
}

export function Dialog({ title, description, children, actions, onClose, busy = false, initialFocusRef }: {
  title: string
  description?: string
  children?: ReactNode
  actions: ReactNode
  onClose: () => void
  busy?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
}) {
  return (
    <AccessibleDialog
      open
      title={title}
      description={description}
      onClose={onClose}
      busy={busy}
      initialFocusRef={initialFocusRef}
      className="expert-dialog"
      footer={actions}
    >
      {children}
    </AccessibleDialog>
  )
}

export function PanelHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="expert-panel-heading"><div><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{action}</header>
}

interface ExpertSelectOption {
  value: string
  label: string
}

export function ExpertSelect({ label, value, options, onChange }: {
  label: string
  value: string
  options: readonly ExpertSelectOption[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const labelId = useId()
  const menuId = useId()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])

  useEffect(() => {
    if (open) setHighlightedIndex(selectedIndex)
  }, [open, selectedIndex])

  function select(index: number) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setHighlightedIndex((current) => (current + direction + options.length) % options.length)
      return
    }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault()
      select(highlightedIndex)
    }
  }

  const selected = options[selectedIndex]
  return (
    <div className="expert-filter-field expert-select" ref={rootRef}>
      <span id={labelId}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="expert-select-trigger"
        aria-labelledby={labelId}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${menuId}-option-${highlightedIndex}` : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span>{selected?.label || 'Chọn giá trị'}</span>
        <motion.span aria-hidden="true" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}><CaretDown size={15} weight="bold" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={menuId}
            className="expert-select-menu"
            role="listbox"
            aria-labelledby={labelId}
            initial={reduceMotion ? false : { opacity: 0, y: -7, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -7, scaleY: 0.9 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            style={{ originY: 0 }}
          >
            {options.map((option, index) => (
              <button
                id={`${menuId}-option-${index}`}
                key={option.value || 'default'}
                type="button"
                role="option"
                aria-selected={option.value === value}
                data-highlighted={highlightedIndex === index || undefined}
                onPointerEnter={() => setHighlightedIndex(index)}
                onClick={() => select(index)}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ExpertDateField({ label, value, min, max, onChange }: {
  label: string
  value: string
  min?: string
  max?: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <label className="expert-filter-field" htmlFor={id}>
      <span>{label}</span>
      <div className="expert-date-field">
        <input id={id} type="date" value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} />
        <CalendarBlank className="expert-date-field-icon" size={15} weight="bold" aria-hidden="true" />
      </div>
    </label>
  )
}

export interface ExpertToastState {
  id: number
  message: string
  tone: 'success' | 'error'
}

export function ExpertToast({ toast, onClose }: { toast: ExpertToastState | null; onClose: () => void }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="expert-toast-region" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className={`expert-toast ${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            {toast.tone === 'success'
              ? <CheckCircle size={22} weight="fill" aria-hidden="true" />
              : <WarningCircle size={22} weight="fill" aria-hidden="true" />}
            <p>{toast.message}</p>
            <button type="button" aria-label="Đóng thông báo" onClick={onClose}><X size={17} aria-hidden="true" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
