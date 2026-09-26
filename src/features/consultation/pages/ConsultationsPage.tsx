import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { Link, useSearchParams } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { ApiClientError } from '@/core/api/api-error'
import { consultationApi } from '../api/consultation-api'
import { BookingPanel } from '../components/BookingPanel'
import { CancelConsultationDialog } from '../components/CancelConsultationDialog'
import { ConsultationBannerActions } from '../components/ConsultationBannerActions'
import { ConsultationList, RecentConsultation } from '../components/ConsultationList'
import { ConsultationToast, type ConsultationToastState } from '../components/ConsultationToast'
import { ReviewConsultationDialog } from '../components/ReviewConsultationDialog'
import { consultationErrorMessage, SLOT_CONFLICT_MESSAGE } from '../model/consultation-errors'
import { runConsultationSubmission } from '../model/consultation-flow'
import { isSelectableConsultationSlot, todayInVietnam } from '../model/consultation-formatters'
import { CONSULTATION_PAGE_SIZE } from '../model/consultation-query'
import type { ConsultationExpert, ConsultationPage, ConsultationRequest, ConsultationSlot, ConsultationSpecialty } from '../model/consultation-types'
import '../styles/consultation.css'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

function isAbortError(error: unknown) {
  return error instanceof ApiClientError && error.code === 'REQUEST_ABORTED'
}

export function ConsultationsPage() {
  const [searchParams] = useSearchParams()
  const expertId = searchParams.get('expertUserId')?.trim() || null
  const randomMode = searchParams.get('mode') === 'random'
  const today = todayInVietnam()
  const [tab, setTab] = useState<'direct' | 'random'>(() => randomMode ? 'random' : 'direct')
  const [expert, setExpert] = useState<ConsultationExpert | null>(null)
  const [expertState, setExpertState] = useState<LoadState>('idle')
  const [expertError, setExpertError] = useState<string | null>(null)
  const [date, setDate] = useState(today)
  const [slots, setSlots] = useState<ConsultationSlot[]>([])
  const [slotsState, setSlotsState] = useState<LoadState>('idle')
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [directNote, setDirectNote] = useState('')
  const [directError, setDirectError] = useState<string | null>(null)
  const [directBusy, setDirectBusy] = useState(false)
  const [specialty, setSpecialty] = useState<ConsultationSpecialty | null>(null)
  const [randomNote, setRandomNote] = useState('')
  const [randomError, setRandomError] = useState<string | null>(null)
  const [randomBusy, setRandomBusy] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [consultations, setConsultations] = useState<ConsultationPage | null>(null)
  const [listState, setListState] = useState<LoadState>('loading')
  const [listError, setListError] = useState<string | null>(null)
  const [recent, setRecent] = useState<ConsultationRequest | null>(null)
  const [highlightRecent, setHighlightRecent] = useState(false)
  const [toast, setToast] = useState<ConsultationToastState | null>(null)
  const [cancelItem, setCancelItem] = useState<ConsultationRequest | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [reviewItem, setReviewItem] = useState<ConsultationRequest | null>(null)
  const [rating, setRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const recentRef = useRef<HTMLDivElement>(null)
  const bookingRef = useRef<HTMLDivElement>(null)
  const toastId = useRef(0)
  const directSubmitting = useRef(false)
  const randomSubmitting = useRef(false)
  const cancelSubmitting = useRef(false)
  const reviewSubmitting = useRef(false)
  const reduceMotion = useReducedMotion()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [expertId])
  useEffect(() => { if (randomMode) setTab('random') }, [randomMode])

  const showToast = useCallback((message: string, tone: ConsultationToastState['tone'] = 'success') => {
    toastId.current += 1
    setToast({ id: toastId.current, message, tone })
  }, [])

  const loadExpert = useCallback(async (signal?: AbortSignal) => {
    if (!expertId) { setExpert(null); setExpertState('idle'); return }
    setExpertState('loading'); setExpertError(null)
    try { setExpert(await consultationApi.expert(expertId, signal)); setExpertState('ready') }
    catch (error) { if (!isAbortError(error)) { setExpert(null); setExpertError(consultationErrorMessage(error)); setExpertState('error') } }
  }, [expertId])

  const loadSlots = useCallback(async (signal?: AbortSignal) => {
    if (!expertId) { setSlots([]); setSlotsState('idle'); return }
    setSlotsState('loading'); setSlotsError(null)
    try { setSlots(await consultationApi.slots(expertId, date, signal)); setSlotsState('ready') }
    catch (error) { if (!isAbortError(error)) { setSlots([]); setSlotsError(consultationErrorMessage(error)); setSlotsState('error') } }
  }, [date, expertId])

  const loadConsultations = useCallback(async (targetPage = pageNumber, signal?: AbortSignal) => {
    setListState('loading'); setListError(null)
    try {
      const response = await consultationApi.list(targetPage, CONSULTATION_PAGE_SIZE, signal)
      if (response.items.length === 0 && targetPage > 1 && response.totalPages < targetPage) {
        setPageNumber(Math.max(1, response.totalPages)); return
      }
      setConsultations(response); setListState('ready')
    } catch (error) { if (!isAbortError(error)) { setListError(consultationErrorMessage(error)); setListState('error') } }
  }, [pageNumber])

  useEffect(() => { const controller = new AbortController(); void loadExpert(controller.signal); return () => controller.abort() }, [loadExpert])
  useEffect(() => { setSelectedSlotId(null); const controller = new AbortController(); void loadSlots(controller.signal); return () => controller.abort() }, [loadSlots])
  useEffect(() => { const controller = new AbortController(); void loadConsultations(pageNumber, controller.signal); return () => controller.abort() }, [loadConsultations, pageNumber])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast((current) => current?.id === toast.id ? null : current), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (!highlightRecent) return
    const timer = window.setTimeout(() => setHighlightRecent(false), 4200)
    return () => window.clearTimeout(timer)
  }, [highlightRecent])

  function revealRecent(item: ConsultationRequest) {
    setRecent(item); setHighlightRecent(true)
    window.requestAnimationFrame(() => { recentRef.current?.focus({ preventScroll: true }); recentRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }) })
  }

  function openRandomBooking() {
    setTab('random')
    window.requestAnimationFrame(() => {
      bookingRef.current?.querySelector<HTMLElement>('#booking-heading')?.focus({ preventScroll: true })
      bookingRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    })
  }

  async function submitDirect() {
    if (!expertId || !expert || directSubmitting.current) return
    const selected = slots.find((slot) => slot.id === selectedSlotId)
    if (!selected || !isSelectableConsultationSlot(selected)) return
    directSubmitting.current = true; setDirectBusy(true); setDirectError(null)
    await runConsultationSubmission({
      submit: () => consultationApi.createDirect({ expertUserId: expertId, slotId: selected.id, note: directNote }),
      onSuccess: async (created) => {
        showToast('Đặt lịch thành công'); revealRecent(created); setSelectedSlotId(null); setDirectNote('')
        setPageNumber(1); await Promise.all([loadConsultations(1), loadSlots()])
      },
      onSlotConflict: async () => { setSelectedSlotId(null); setDirectError(SLOT_CONFLICT_MESSAGE); await loadSlots() },
      onError: (error) => setDirectError(consultationErrorMessage(error)),
    })
    directSubmitting.current = false; setDirectBusy(false)
  }

  async function submitRandom() {
    if (!specialty || randomSubmitting.current) return
    randomSubmitting.current = true; setRandomBusy(true); setRandomError(null)
    await runConsultationSubmission({
      submit: () => consultationApi.createRandom({ specialty, note: randomNote }),
      onSuccess: async (created) => {
        showToast('Đã gửi yêu cầu tư vấn'); revealRecent(created); setSpecialty(null); setRandomNote('')
        setPageNumber(1); await loadConsultations(1)
      },
      onError: (error) => setRandomError(consultationErrorMessage(error)),
    })
    randomSubmitting.current = false; setRandomBusy(false)
  }

  function openCancel(item: ConsultationRequest) { setCancelItem(item); setCancelError(null) }
  function closeCancel() { if (!cancelSubmitting.current) { setCancelItem(null); setCancelError(null) } }
  async function confirmCancel() {
    if (!cancelItem || cancelSubmitting.current) return
    cancelSubmitting.current = true; setCancelBusy(true); setCancelError(null)
    try {
      await consultationApi.cancel(cancelItem.id)
      showToast('Đã hủy lịch tư vấn')
      const refreshes: Array<Promise<unknown>> = [loadConsultations(pageNumber)]
      if (cancelItem.expertUserId === expertId && cancelItem.slot?.date === date) refreshes.push(loadSlots())
      await Promise.all(refreshes)
      setCancelItem(null)
    } catch (error) { setCancelError(consultationErrorMessage(error)) }
    finally { cancelSubmitting.current = false; setCancelBusy(false) }
  }

  function openReview(item: ConsultationRequest) { setReviewItem(item); setRating(0); setReviewComment(''); setReviewError(null) }
  function closeReview() { if (!reviewSubmitting.current) { setReviewItem(null); setReviewError(null) } }
  async function submitReview() {
    if (!reviewItem || !rating || reviewSubmitting.current) return
    reviewSubmitting.current = true; setReviewBusy(true); setReviewError(null)
    try {
      await consultationApi.review(reviewItem.id, { rating, comment: reviewComment })
      showToast('Cảm ơn bạn đã gửi đánh giá')
      await loadConsultations(pageNumber)
      setReviewItem(null)
    } catch (error) { setReviewError(consultationErrorMessage(error)) }
    finally { reviewSubmitting.current = false; setReviewBusy(false) }
  }

  return <main className="consultation-page">
    <ConsultationToast toast={toast} onClose={() => setToast(null)} />
    <section className="consultation-banner" aria-labelledby="consultation-banner-title">
      <img src="/bannerbook.jpg" alt="" fetchPriority="high" />
      <span className="consultation-banner__overlay" aria-hidden="true" />
      <h1 id="consultation-banner-title">Đăng ký tư vấn</h1>
      <ConsultationBannerActions onRandomBooking={openRandomBooking} />
    </section>
    <nav className="consultation-back-nav" aria-label="Điều hướng quay lại">
      <Link to="/app/experts"><ArrowLeft size={19} weight="bold" aria-hidden="true" />Quay lại danh sách chuyên gia</Link>
    </nav>
    <div ref={bookingRef} id="consultation-booking-form" className="consultation-booking-anchor">
      <BookingPanel
        tab={tab} onTabChange={setTab} expertId={expertId} expert={expert} expertLoading={expertState === 'loading'} expertError={expertError} onRetryExpert={() => void loadExpert()}
        date={date} minDate={today} onDateChange={(value) => { setSelectedSlotId(null); setDate(value && value >= today ? value : today); setDirectError(null) }} slots={slots} slotsLoading={slotsState === 'loading'} slotsError={slotsError} onRetrySlots={() => void loadSlots()}
        selectedSlotId={selectedSlotId} onSelectSlot={(id) => { setSelectedSlotId(id); setDirectError(null) }} directNote={directNote} onDirectNoteChange={setDirectNote} directError={directError} directBusy={directBusy} onDirectSubmit={() => void submitDirect()}
        specialty={specialty} onSpecialtyChange={(value) => { setSpecialty(value); setRandomError(null) }} randomNote={randomNote} onRandomNoteChange={setRandomNote} randomError={randomError} randomBusy={randomBusy} onRandomSubmit={() => void submitRandom()}
      />
    </div>
    {recent && <div ref={recentRef} tabIndex={-1} className="consultation-recent-focus"><RecentConsultation item={recent} highlighted={highlightRecent} /></div>}
    <ConsultationList page={consultations} loading={listState === 'loading'} error={listError} onRetry={() => void loadConsultations(pageNumber)} onPageChange={setPageNumber} onCancel={openCancel} onReview={openReview} />
    <CancelConsultationDialog item={cancelItem} busy={cancelBusy} error={cancelError} onClose={closeCancel} onConfirm={() => void confirmCancel()} />
    <ReviewConsultationDialog item={reviewItem} rating={rating} comment={reviewComment} busy={reviewBusy} error={reviewError} onRatingChange={setRating} onCommentChange={setReviewComment} onClose={closeReview} onSubmit={() => void submitReview()} />
  </main>
}
