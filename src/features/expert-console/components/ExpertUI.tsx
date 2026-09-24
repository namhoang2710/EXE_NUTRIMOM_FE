import { ArrowLeft, ArrowRight, WarningCircle } from '@phosphor-icons/react'
import { useEffect, type PropsWithChildren, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function ResourceState({ loading, error, empty, onRetry, children }: PropsWithChildren<{
  loading: boolean
  error: string
  empty: boolean
  onRetry: () => void
}>) {
  if (loading) return <div className="expert-skeleton" aria-label="Đang tải dữ liệu"><span /><span /><span /></div>
  if (error) return <div className="expert-state"><WarningCircle size={28} weight="duotone" /><h3>Chưa thể tải dữ liệu</h3><p>{error}</p><button className="expert-button secondary" type="button" onClick={onRetry}>Thử lại</button></div>
  if (empty) return <div className="expert-state"><span className="expert-empty-mark" aria-hidden="true">✦</span><h3>Chưa có dữ liệu phù hợp</h3><p>Hãy thay đổi bộ lọc hoặc quay lại sau.</p></div>
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

export function Dialog({ title, description, children, actions, onClose }: {
  title: string
  description?: string
  children?: ReactNode
  actions: ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  const dialog = (
    <div className="expert-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="expert-dialog" role="dialog" aria-modal="true" aria-labelledby="expert-dialog-title">
        <div className="expert-dialog-heading">
          <span><WarningCircle size={22} weight="duotone" /></span>
          <div><h2 id="expert-dialog-title">{title}</h2>{description && <p>{description}</p>}</div>
        </div>
        {children}
        <footer>{actions}</footer>
      </section>
    </div>
  )
  return createPortal(dialog, document.body)
}

export function PanelHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="expert-panel-heading"><div><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{action}</header>
}
