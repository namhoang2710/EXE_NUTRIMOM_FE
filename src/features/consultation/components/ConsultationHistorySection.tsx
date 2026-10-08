import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { consultationApi } from '../api/consultation-api'
import { CancelConsultationDialog } from './CancelConsultationDialog'
import { ConsultationCard, ConsultationList } from './ConsultationList'
import { ConsultationToast, type ConsultationToastState } from './ConsultationToast'
import { ReviewConsultationDialog } from './ReviewConsultationDialog'
import { useConsultationHistory } from '../hooks/useConsultationHistory'
import type { ConsultationRequest } from '../model/consultation-types'

const POST_CALL_REVIEW_RETRY_MS = 16_000

export function ConsultationHistorySection({ onCancelled, showHeading = true }: { onCancelled?: (item: ConsultationRequest) => void | Promise<void>; showHeading?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const focusedId = searchParams.get('request')?.trim() || ''
  const reviewRequested = searchParams.get('review') === '1'
  const [focused, setFocused] = useState<ConsultationRequest | null>(null)
  const [focusError, setFocusError] = useState('')
  const focusedRef = useRef<HTMLDivElement>(null)
  const autoReviewOpened = useRef('')
  const [toast, setToast] = useState<ConsultationToastState | null>(null)
  const toastId = useRef(0)
  const notify = useCallback((message: string, tone: ConsultationToastState['tone'] = 'success') => {
    toastId.current += 1
    setToast({ id: toastId.current, message, tone })
  }, [])
  const history = useConsultationHistory({ onNotify: notify, onCancelled })
  const openReviewRef = useRef(history.openReview)
  openReviewRef.current = history.openReview
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast((current) => current?.id === toast.id ? null : current), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (!focusedId) { setFocused(null); setFocusError(''); return }
    const controller = new AbortController()
    let reviewRetryTimer: number | undefined
    setFocused(null); setFocusError('')
    const loadFocused = (allowReviewRetry: boolean) => void consultationApi.get(focusedId, controller.signal).then((item) => {
      if (controller.signal.aborted) return
      setFocused(item)
      const shouldOpenReview = reviewRequested && item.canReview && autoReviewOpened.current !== item.id
      if (shouldOpenReview) {
        autoReviewOpened.current = item.id
        openReviewRef.current(item)
      }
      if (reviewRequested && !item.canReview && item.status === 'PENDING_CONSULTATION' && allowReviewRetry) {
        // The expiry scheduler runs every 15 seconds. One delayed refresh bridges that hand-off
        // window without polling or issuing requests from the in-call countdown.
        reviewRetryTimer = window.setTimeout(() => loadFocused(false), POST_CALL_REVIEW_RETRY_MS)
      }
      if (!shouldOpenReview) {
        window.requestAnimationFrame(() => {
          focusedRef.current?.focus({ preventScroll: true })
          focusedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      }
    }).catch(() => {
      if (!controller.signal.aborted) setFocusError('Không thể mở nội dung tư vấn này. Nội dung có thể không còn tồn tại hoặc bạn không có quyền xem.')
    })
    loadFocused(true)
    return () => {
      controller.abort()
      if (reviewRetryTimer !== undefined) window.clearTimeout(reviewRetryTimer)
    }
  }, [focusedId, reviewRequested])

  function closeFocused() {
    const next = new URLSearchParams(searchParams)
    next.delete('request')
    next.delete('review')
    setSearchParams(next, { replace: true })
  }

  return <>
    <ConsultationToast toast={toast} onClose={() => setToast(null)} />
    {focusedId && <section ref={focusedRef} tabIndex={-1} className="consultation-recent" aria-label="Chi tiết tư vấn được mở từ thông báo"><div className="consultation-recent__heading"><span>Từ thông báo</span><h2>Chi tiết tư vấn</h2><button type="button" className="consultation-text-button" onClick={closeFocused}>Đóng chi tiết</button></div>{focused ? <ConsultationCard item={focused} highlighted onCancel={history.openCancel} onReview={history.openReview} /> : focusError ? <p role="alert">{focusError}</p> : <p role="status">Đang tải chi tiết tư vấn...</p>}</section>}
    <ConsultationList page={history.page} loading={history.loading} error={history.error} showHeading={showHeading} onRetry={() => void history.load(history.pageNumber)} onPageChange={history.setPageNumber} onCancel={history.openCancel} onReview={history.openReview} />
    <CancelConsultationDialog item={history.cancelItem} busy={history.cancelBusy} error={history.cancelError} onClose={history.closeCancel} onConfirm={() => void history.confirmCancel()} />
    <ReviewConsultationDialog item={history.reviewItem} rating={history.rating} comment={history.reviewComment} busy={history.reviewBusy} error={history.reviewError} onRatingChange={history.setRating} onCommentChange={history.setReviewComment} onClose={history.closeReview} onSubmit={() => void history.submitReview()} />
  </>
}
