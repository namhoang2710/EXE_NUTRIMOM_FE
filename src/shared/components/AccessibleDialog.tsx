import { X } from '@phosphor-icons/react'
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { focusTargetForTab, getFocusableElements, restoreDialogFocus, scrollbarGutter, shouldCloseDialogForKey } from '@/shared/model/dialog-focus'

let scrollLockCount = 0
let previousOverflow = ''
let previousPaddingRight = ''

interface AccessibleDialogProps {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  busy?: boolean
  closeLabel?: string
  className?: string
  stable?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
}

export function AccessibleDialog({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  busy = false,
  closeLabel = 'Đóng',
  className,
  stable = false,
  initialFocusRef,
}: AccessibleDialogProps) {
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const busyRef = useRef(busy)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  busyRef.current = busy
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const frame = window.requestAnimationFrame(() => (initialFocusRef?.current ?? closeRef.current)?.focus())
    scrollLockCount += 1
    if (scrollLockCount === 1) {
      const gutter = scrollbarGutter(window.innerWidth, document.documentElement.clientWidth)
      previousOverflow = document.body.style.overflow
      previousPaddingRight = document.body.style.paddingRight
      document.body.style.overflow = 'hidden'
      if (gutter > 0) document.body.style.paddingRight = `${gutter}px`
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (shouldCloseDialogForKey(event.key, busyRef.current)) onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = getFocusableElements(panelRef.current)
      if (focusable.length === 0) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }
      const target = focusTargetForTab(focusable, document.activeElement, event.shiftKey)
      if (target) {
        event.preventDefault()
        target.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      scrollLockCount = Math.max(0, scrollLockCount - 1)
      if (scrollLockCount === 0) {
        document.body.style.overflow = previousOverflow
        document.body.style.paddingRight = previousPaddingRight
      }
      restoreDialogFocus(opener)
    }
  }, [initialFocusRef, open])

  if (!open) return null

  return createPortal(
    <div className="nm-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section
        ref={panelRef}
        className={cn('nm-dialog-panel', stable && 'nm-dialog-panel-stable', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={busy}
        tabIndex={-1}
      >
        <header className="nm-dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button ref={closeRef} className="nm-dialog-close" type="button" aria-label={closeLabel} disabled={busy} onClick={onClose}><X size={20} /></button>
        </header>
        <div className="nm-dialog-body">{children}</div>
        {footer && <footer className="nm-dialog-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}
