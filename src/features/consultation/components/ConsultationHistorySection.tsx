import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { consultationApi } from '../api/consultation-api'
import { CancelConsultationDialog } from './CancelConsultationDialog'
import { ConsultationCard, ConsultationList } from './ConsultationList'
import { ConsultationToast, type ConsultationToastState } from './ConsultationToast'
import { ReviewConsultationDialog } from './ReviewConsultationDialog'
import { useConsultationHistory } from '../hooks/useConsultationHistory'
import type { ConsultationRequest } from '../model/consultation-types'

export function ConsultationHistorySection({ onCancelled }: { onCancelled?: (item: ConsultationRequest) => void | Promise<void> }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const focusedId = searchParams.get('request')?.trim() || ''
  const [focused, setFocused] = useState<ConsultationRequest | null>(null)
  const [focusError, setFocusError] = useState('')
  const focusedRef = useRef<HTMLDivElement>(null)
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
  useEffect(() => {
    if (!focusedId) { setFocused(null); setFocusError(''); return }
    const controller = new AbortController()
    setFocused(null); setFocusError('')
    void consultationApi.get(focusedId, controller.signal).then((item) => {
      if (controller.signal.aborted) return
      setFocused(item)
      window.requestAnimationFrame(() => {
        focusedRef.current?.focus({ preventScroll: true })
        focusedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }).catch(() => {
      if (!controller.signal.aborted) setFocusError('Không thể mở nội dung tư vấn này. Nội dung có thể không còn tồn tại hoặc bạn không có quyền xem.')
    })
    return () => controller.abort()
  }, [focusedId])

  function closeFocused() {
    const next = new URLSearchParams(searchParams)
    next.delete('request')
    setSearchParams(next, { replace: true })
  }

  return <>
    <ConsultationToast toast={toast} onClose={() => setToast(null)} />
    {focusedId && <section ref={focusedRef} tabIndex={-1} className="consultation-recent" aria-label="Chi tiết tư vấn được mở từ thông báo"><div className="consultation-recent__heading"><span>Từ thông báo</span><h2>Chi tiết tư vấn</h2><button type="button" className="consultation-text-button" onClick={closeFocused}>Đóng chi tiết</button></div>{focused ? <ConsultationCard item={focused} highlighted onCancel={history.openCancel} onReview={history.openReview} /> : focusError ? <p role="alert">{focusError}</p> : <p role="status">Đang tải chi tiết tư vấn...</p>}</section>}
    <ConsultationList page={history.page} loading={history.loading} error={history.error} onRetry={() => void history.load(history.pageNumber)} onPageChange={history.setPageNumber} onCancel={history.openCancel} onReview={history.openReview} />
    <CancelConsultationDialog item={history.cancelItem} busy={history.cancelBusy} error={history.cancelError} onClose={history.closeCancel} onConfirm={() => void history.confirmCancel()} />
    <ReviewConsultationDialog item={history.reviewItem} rating={history.rating} comment={history.reviewComment} busy={history.reviewBusy} error={history.reviewError} onRatingChange={history.setRating} onCommentChange={history.setReviewComment} onClose={history.closeReview} onSubmit={() => void history.submitReview()} />
  </>
}
