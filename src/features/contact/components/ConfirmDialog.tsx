import { WarningCircle } from '@phosphor-icons/react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE = 'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  /** `admin` reuses the classes already styled by admin.css; `user` uses contact.css. */
  variant?: 'admin' | 'user'
  danger?: boolean
  busy?: boolean
  error?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Hộp thoại xác nhận có quản lý focus đầy đủ (focus ban đầu, bẫy Tab, Esc, trả focus về nút mở).
 * Dialog xoá bài viết trong AdminKnowledgePage chưa làm phần này — có thể chuyển sang dùng chung sau.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Đóng',
  variant = 'admin',
  danger = false,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panel = useRef<HTMLElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    cancelButton.current?.focus()
    return () => opener?.focus?.()
  }, [])

  // Khoá cuộn nền. `admin.css` chỉ nạp trong AdminLayout nên bản user cần class riêng.
  useEffect(() => {
    const lockClass = variant === 'admin' ? 'admin-dialog-open' : 'nm-dialog-open'
    // Bù đúng bề rộng thanh cuộn vừa biến mất để nội dung phía sau không nhảy ngang.
    const gutter = window.innerWidth - document.documentElement.clientWidth
    const previousPadding = document.body.style.paddingRight
    document.body.classList.add(lockClass)
    if (gutter > 0) {
      document.body.style.paddingRight = `${gutter}px`
      // Lớp backdrop là `fixed` nên không nhận padding của body; nó tự trừ qua biến này.
      document.body.style.setProperty('--nm-scrollbar-gutter', `${gutter}px`)
    }
    return () => {
      document.body.classList.remove(lockClass)
      document.body.style.paddingRight = previousPadding
      document.body.style.removeProperty('--nm-scrollbar-gutter')
    }
  }, [variant])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (!busy) onCancel()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return
      const focusable = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !panel.current.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel])

  const backdropClass = variant === 'admin' ? 'admin-dialog-backdrop' : 'nm-contact-dialog-backdrop'
  const panelClass = variant === 'admin' ? 'admin-confirm-dialog' : 'nm-contact-dialog'
  const iconClass = variant === 'admin' ? 'admin-confirm-icon' : 'nm-contact-dialog-icon'
  const errorClass = variant === 'admin' ? 'admin-field-error' : 'nm-form-error'
  const cancelClass = variant === 'admin' ? 'admin-button secondary' : 'nm-secondary-action'
  const confirmClass = variant === 'admin'
    ? `admin-button ${danger ? 'danger' : 'primary'}`
    : `${danger ? 'nm-danger-action' : 'nm-primary-action'}`

  // Phải thoát khỏi cây DOM của trang: `.nm-account-workspace-main > main` giữ lại
  // `transform` sau animation (fill-mode `both`), biến nó thành containing block của
  // `position: fixed` nên hộp thoại sẽ canh giữa theo trang thay vì theo màn hình.
  // Bản admin chỉ ra tới `.admin-shell` vì các biến `--admin-*` khai báo ở đó.
  const host = (variant === 'admin' ? document.querySelector<HTMLElement>('.admin-shell') : null) ?? document.body

  return createPortal(
    <div
      className={backdropClass}
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel() }}
    >
      <section ref={panel} className={panelClass} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <span className={iconClass}><WarningCircle size={28} aria-hidden="true" /></span>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        {error && <div className={errorClass} role="alert">{error}</div>}
        <div className="nm-contact-dialog-actions">
          <button ref={cancelButton} className={cancelClass} type="button" disabled={busy} onClick={onCancel}>{cancelLabel}</button>
          <button className={confirmClass} type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Đang xử lý…' : confirmLabel}</button>
        </div>
      </section>
    </div>,
    host,
  )
}
