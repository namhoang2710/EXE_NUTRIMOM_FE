import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { consultationApi } from '../api/consultation-api'
import { consultationErrorMessage } from '../model/consultation-errors'
import { CONSULTATION_PAGE_SIZE } from '../model/consultation-query'
import { normalizeConsultationRating } from '../model/consultation-rating'
import type { ConsultationPage, ConsultationRequest } from '../model/consultation-types'

function isAbortError(error: unknown) {
  return error instanceof ApiClientError && error.code === 'REQUEST_ABORTED'
}

export function useConsultationHistory({ onNotify, onCancelled }: {
  onNotify: (message: string, tone?: 'success' | 'error') => void
  onCancelled?: (item: ConsultationRequest) => void | Promise<void>
}) {
  const [pageNumber, setPageNumber] = useState(1)
  const [page, setPage] = useState<ConsultationPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelItem, setCancelItem] = useState<ConsultationRequest | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [reviewItem, setReviewItem] = useState<ConsultationRequest | null>(null)
  const [rating, setRatingState] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const cancelSubmitting = useRef(false)
  const reviewSubmitting = useRef(false)

  const load = useCallback(async (targetPage = pageNumber, signal?: AbortSignal) => {
    setLoading(true); setError(null)
    try {
      const response = await consultationApi.list(targetPage, CONSULTATION_PAGE_SIZE, signal)
      if (response.items.length === 0 && targetPage > 1 && response.totalPages < targetPage) {
        setPageNumber(Math.max(1, response.totalPages))
        return
      }
      setPage(response); setLoading(false)
    } catch (requestError) {
      if (!isAbortError(requestError)) { setError(consultationErrorMessage(requestError)); setLoading(false) }
    }
  }, [pageNumber])

  useEffect(() => {
    const controller = new AbortController()
    void load(pageNumber, controller.signal)
    return () => controller.abort()
  }, [load, pageNumber])

  function openCancel(item: ConsultationRequest) { setCancelItem(item); setCancelError(null) }
  function closeCancel() { if (!cancelSubmitting.current) { setCancelItem(null); setCancelError(null) } }
  async function confirmCancel() {
    if (!cancelItem || cancelSubmitting.current) return
    const item = cancelItem
    cancelSubmitting.current = true; setCancelBusy(true); setCancelError(null)
    try {
      await consultationApi.cancel(item.id)
      onNotify('Đã hủy lịch tư vấn')
      await Promise.all([load(pageNumber), onCancelled?.(item)])
      setCancelItem(null)
    } catch (requestError) { setCancelError(consultationErrorMessage(requestError)) }
    finally { cancelSubmitting.current = false; setCancelBusy(false) }
  }

  function openReview(item: ConsultationRequest) { setReviewItem(item); setRatingState(0); setReviewComment(''); setReviewError(null) }
  function closeReview() { if (!reviewSubmitting.current) { setReviewItem(null); setReviewError(null) } }
  function setRating(value: number) { setRatingState(value ? normalizeConsultationRating(value) : 0) }
  async function submitReview() {
    if (!reviewItem || !rating || reviewSubmitting.current) return
    reviewSubmitting.current = true; setReviewBusy(true); setReviewError(null)
    try {
      await consultationApi.review(reviewItem.id, { rating: normalizeConsultationRating(rating), comment: reviewComment })
      onNotify('Cảm ơn bạn đã gửi đánh giá')
      await load(pageNumber)
      setReviewItem(null)
    } catch (requestError) { setReviewError(consultationErrorMessage(requestError)) }
    finally { reviewSubmitting.current = false; setReviewBusy(false) }
  }

  return {
    page, loading, error, pageNumber, setPageNumber, load,
    cancelItem, cancelBusy, cancelError, openCancel, closeCancel, confirmCancel,
    reviewItem, rating, setRating, reviewComment, setReviewComment, reviewBusy, reviewError, openReview, closeReview, submitReview,
  }
}
