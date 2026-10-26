import { ApiClientError } from '@/core/api/api-error'

export function ReviewStatus({ error, loading, remaining = 0, onRetry }: { error?: unknown; loading?: boolean; remaining?: number; onRetry?: () => void }) {
  if (remaining) return <p className="nm-review-notice" role="status">Vui lòng thử lại sau {remaining} giây.</p>
  if (error) {
    const message = error instanceof ApiClientError && error.status === 404 ? 'Tính năng đánh giá đang được cập nhật. Vui lòng quay lại sau.' : error instanceof Error ? error.message : 'Chưa thể tải đánh giá.'
    return <div className="nm-review-notice is-error" role="alert"><p>{message}</p>{onRetry && <button type="button" onClick={onRetry}>Thử lại</button>}</div>
  }
  return loading ? <p className="nm-review-notice" role="status">Đang tải đánh giá…</p> : null
}
