import { X } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'

interface ExpertAdDialogProps {
  open: boolean
  onClose: () => void
  onBannerClick: () => void
}

export function ExpertAdDialog({ open, onClose, onBannerClick }: ExpertAdDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const bannerButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0)

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        const focusBanner = event.shiftKey
          ? document.activeElement === closeButtonRef.current
          : document.activeElement !== bannerButtonRef.current
        if (focusBanner) bannerButtonRef.current?.focus()
        else closeButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousBodyOverflow
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="expert-ad-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="expert-ad-dialog" role="dialog" aria-modal="true" aria-labelledby="expert-ad-title">
        <h2 className="sr-only" id="expert-ad-title">Ưu đãi từ NutriMom</h2>
        <button
          ref={closeButtonRef}
          className="expert-ad-dialog__close"
          type="button"
          aria-label="Đóng quảng cáo"
          onClick={onClose}
        >
          <X size={22} weight="bold" aria-hidden="true" />
        </button>
        <button ref={bannerButtonRef} className="expert-ad-dialog__banner" type="button" onClick={onBannerClick}>
          <img src="/bannerQC.png" alt="Ưu đãi NutriMom, đăng nhập để tìm hiểu thêm" />
        </button>
      </div>
    </div>
  )
}
