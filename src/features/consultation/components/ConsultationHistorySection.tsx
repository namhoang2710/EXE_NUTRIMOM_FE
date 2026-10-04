import { useCallback, useEffect, useRef, useState } from 'react'
import { CancelConsultationDialog } from './CancelConsultationDialog'
import { ConsultationList } from './ConsultationList'
import { ConsultationToast, type ConsultationToastState } from './ConsultationToast'
import { ReviewConsultationDialog } from './ReviewConsultationDialog'
import { useConsultationHistory } from '../hooks/useConsultationHistory'
import type { ConsultationRequest } from '../model/consultation-types'

export function ConsultationHistorySection({ onCancelled }: { onCancelled?: (item: ConsultationRequest) => void | Promise<void> }) {
  const [toast, setToast] = useState<ConsultationToastState | null>(null)
  const toastId = useRef(0)
  const notify = useCallback((message: string, tone: ConsultationToastState['tone'] = 'success') => {
    toastId.current += 1
    setToast({ id: toastId.current, message, tone })
  }, [])
  const history = useConsultationHistory({ onNotify: notify, onCancelled })
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast((current) => current?.id === toast.id ? null : current), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  return <>
    <ConsultationToast toast={toast} onClose={() => setToast(null)} />
    <ConsultationList page={history.page} loading={history.loading} error={history.error} onRetry={() => void history.load(history.pageNumber)} onPageChange={history.setPageNumber} onCancel={history.openCancel} onReview={history.openReview} />
    <CancelConsultationDialog item={history.cancelItem} busy={history.cancelBusy} error={history.cancelError} onClose={history.closeCancel} onConfirm={() => void history.confirmCancel()} />
    <ReviewConsultationDialog item={history.reviewItem} rating={history.rating} comment={history.reviewComment} busy={history.reviewBusy} error={history.reviewError} onRatingChange={history.setRating} onCommentChange={history.setReviewComment} onClose={history.closeReview} onSubmit={() => void history.submitReview()} />
  </>
}
