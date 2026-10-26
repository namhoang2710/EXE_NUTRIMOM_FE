import { X } from '@phosphor-icons/react'
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from 'motion/react'
import { cn } from '@/lib/utils'
import {
  focusTargetForTab,
  getFocusableElements,
  restoreDialogFocus,
  scrollbarGutter,
  shouldCloseDialogForKey,
} from '@/shared/model/dialog-focus'

let scrollLockCount = 0
let previousOverflow = ''
let previousPaddingRight = ''
const dialogStack: Array<HTMLElement | null> = []

interface AccessibleDialogProps {
  open: boolean
  title: string
  description?: string
  headerContent?: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  busy?: boolean
  closeLabel?: string
  className?: string
  stable?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  animated?: boolean
}

export function AccessibleDialog({
  open,
  animated = false,
  ...props
}: AccessibleDialogProps) {
  if (!open && !animated) return null
  return createPortal(
    animated ? (
      <AnimatePresence>
        {open && <DialogPanel key="dialog" {...props} animated />}
      </AnimatePresence>
    ) : (
      <DialogPanel {...props} />
    ),
    document.body,
  )
}

function DialogPanel({
  title,
  description,
  headerContent,
  children,
  footer,
  onClose,
  busy = false,
  closeLabel = 'Đóng',
  className,
  stable = false,
  initialFocusRef,
  animated = false,
}: Omit<AccessibleDialogProps, 'open'>) {
  const present = useIsPresent()
  const reduced = useReducedMotion()
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const busyRef = useRef(busy)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  busyRef.current = busy || !present
  onCloseRef.current = onClose

  useEffect(() => {
    const element = panelRef.current
    dialogStack.push(element)
    const opener = document.activeElement as HTMLElement | null
    const frame = window.requestAnimationFrame(() =>
      (initialFocusRef?.current ?? closeRef.current)?.focus(),
    )
    scrollLockCount += 1
    if (scrollLockCount === 1) {
      const gutter = scrollbarGutter(
        window.innerWidth,
        document.documentElement.clientWidth,
      )
      previousOverflow = document.body.style.overflow
      previousPaddingRight = document.body.style.paddingRight
      document.body.style.overflow = 'hidden'
      if (gutter > 0) document.body.style.paddingRight = `${gutter}px`
    }

    function onKeyDown(event: KeyboardEvent) {
      if (dialogStack.at(-1) !== element) return
      if (event.key === 'Escape') {
        if (shouldCloseDialogForKey(event.key, busyRef.current))
          onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = getFocusableElements(panelRef.current)
      if (focusable.length === 0) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }
      if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey
          ? focusable[focusable.length - 1]
          : focusable[0]
        ).focus()
        return
      }
      const target = focusTargetForTab(
        focusable,
        document.activeElement,
        event.shiftKey,
      )
      if (target) {
        event.preventDefault()
        target.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      const stackIndex = dialogStack.lastIndexOf(element)
      if (stackIndex !== -1) dialogStack.splice(stackIndex, 1)
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      scrollLockCount = Math.max(0, scrollLockCount - 1)
      if (scrollLockCount === 0) {
        document.body.style.overflow = previousOverflow
        document.body.style.paddingRight = previousPaddingRight
      }
      restoreDialogFocus(opener)
    }
  }, [initialFocusRef])

  const Backdrop = animated ? motion.div : 'div'
  const Panel = animated ? motion.section : 'section'
  const backdropMotion = animated
    ? {
        initial: { opacity: reduced ? 1 : 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: reduced ? 0 : 0.18 },
        style: { animation: 'none' },
      }
    : {}
  const panelMotion = animated
    ? {
        initial: reduced
          ? (false as const)
          : { opacity: 0, y: 12, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: {
          opacity: 0,
          y: reduced ? 0 : 8,
          scale: reduced ? 1 : 0.98,
          transition: { duration: reduced ? 0 : 0.18 },
        },
        transition: { duration: reduced ? 0 : 0.24 },
        style: { animation: 'none' },
      }
    : {}

  return (
    <Backdrop
      {...backdropMotion}
      className="nm-dialog-backdrop"
      data-dialog-state={present ? 'open' : 'closing'}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busyRef.current) {
          // Avoid a backdrop mousedown stealing the focus restored after a fast exit.
          event.preventDefault()
          onCloseRef.current()
        }
      }}
    >
      <Panel
        {...panelMotion}
        ref={panelRef}
        className={cn(
          'nm-dialog-panel',
          stable && 'nm-dialog-panel-stable',
          className,
        )}
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
          <button
            ref={closeRef}
            className="nm-dialog-close"
            type="button"
            aria-label={closeLabel}
            disabled={busy}
            onClick={() => {
              if (!busyRef.current) onCloseRef.current()
            }}
          >
            <X size={20} />
          </button>
          {headerContent && (
            <div className="nm-dialog-header-extra">{headerContent}</div>
          )}
        </header>
        <div className="nm-dialog-body">{children}</div>
        {footer && <footer className="nm-dialog-footer">{footer}</footer>}
      </Panel>
    </Backdrop>
  )
}
