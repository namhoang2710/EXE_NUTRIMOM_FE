import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { Link, useSearchParams } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { ApiClientError } from '@/core/api/api-error'
import { consultationApi } from '../api/consultation-api'
import { BookingPanel } from '../components/BookingPanel'
import { ConsultationBannerActions } from '../components/ConsultationBannerActions'
import { ConsultationHistorySection } from '../components/ConsultationHistorySection'
import { RecentConsultation } from '../components/ConsultationList'
import { ConsultationToast, type ConsultationToastState } from '../components/ConsultationToast'
import { consultationErrorMessage, SLOT_CONFLICT_MESSAGE } from '../model/consultation-errors'
import { runConsultationSubmission } from '../model/consultation-flow'
import { todayInVietnam } from '../model/consultation-formatters'
import { unavailableReasonLabel } from '../model/slot-grid'
import type { ConsultationExpert, ConsultationRequest, ConsultationSpecialty, DayAvailability } from '../model/consultation-types'
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
  const [availability, setAvailability] = useState<DayAvailability | null>(null)
  const [availabilityState, setAvailabilityState] = useState<LoadState>('idle')
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null)
  const [directNote, setDirectNote] = useState('')
  const [directError, setDirectError] = useState<string | null>(null)
  const [directBusy, setDirectBusy] = useState(false)
  const [specialty, setSpecialty] = useState<ConsultationSpecialty | null>(null)
  const [randomNote, setRandomNote] = useState('')
  const [randomError, setRandomError] = useState<string | null>(null)
  const [randomBusy, setRandomBusy] = useState(false)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [recent, setRecent] = useState<ConsultationRequest | null>(null)
  const [highlightRecent, setHighlightRecent] = useState(false)
  const [toast, setToast] = useState<ConsultationToastState | null>(null)
  const recentRef = useRef<HTMLDivElement>(null)
  const bookingRef = useRef<HTMLDivElement>(null)
  const toastId = useRef(0)
  const directSubmitting = useRef(false)
  const randomSubmitting = useRef(false)
  const selectedStartTimeRef = useRef<string | null>(null)
  const availabilityRequest = useRef<AbortController | null>(null)
  const lastFocusRefresh = useRef(Date.now())
  const reduceMotion = useReducedMotion()
  selectedStartTimeRef.current = selectedStartTime

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

  const loadAvailability = useCallback(async (signal?: AbortSignal) => {
    availabilityRequest.current?.abort()
    if (!expertId) { setAvailability(null); setAvailabilityState('idle'); return }
    const controller = new AbortController()
    availabilityRequest.current = controller
    const abortFromCaller = () => controller.abort()
    signal?.addEventListener('abort', abortFromCaller, { once: true })
    setAvailabilityState('loading'); setAvailabilityError(null)
    try {
      const response = await consultationApi.availability(expertId, date, controller.signal)
      if (controller.signal.aborted) return
      setAvailability(response)
      setAvailabilityState('ready')
      const selected = selectedStartTimeRef.current
      if (selected) {
        const refreshedSlot = response.slots.find((slot) => slot.startTime === selected)
        if (!refreshedSlot?.available || response.dayOff) {
          setSelectedStartTime(null)
          const reason = refreshedSlot?.reason || (response.dayOff ? 'DAY_OFF' : undefined)
          setDirectError(reason ? `Khung giờ đã chọn hiện ở trạng thái “${unavailableReasonLabel(reason)}”. Vui lòng chọn khung giờ khác.` : SLOT_CONFLICT_MESSAGE)
        }
      }
    } catch (error) {
      if (!isAbortError(error)) { setAvailability(null); setAvailabilityError(consultationErrorMessage(error)); setAvailabilityState('error') }
    } finally {
      signal?.removeEventListener('abort', abortFromCaller)
      if (availabilityRequest.current === controller) availabilityRequest.current = null
    }
  }, [date, expertId])

  useEffect(() => { const controller = new AbortController(); void loadExpert(controller.signal); return () => controller.abort() }, [loadExpert])
  useEffect(() => { setSelectedStartTime(null); setDirectError(null) }, [date, expertId])
  useEffect(() => { const controller = new AbortController(); void loadAvailability(controller.signal); return () => controller.abort() }, [loadAvailability])
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
  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastFocusRefresh.current < 10_000) return
      lastFocusRefresh.current = Date.now()
      void loadAvailability()
    }
    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)
    return () => {
      window.removeEventListener('focus', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [loadAvailability])

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
    if (!expertId || !expert || directSubmitting.current) return false
    const selected = availability?.slots.find((slot) => slot.startTime === selectedStartTime)
    if (!availability || !selected?.available || availability.dayOff) return false
    directSubmitting.current = true; setDirectBusy(true); setDirectError(null)
    const succeeded = await runConsultationSubmission({
      submit: () => consultationApi.createDirect({ expertUserId: expertId, date, startTime: selected.startTime, note: directNote }),
      onSuccess: async (created) => {
        showToast('Đặt lịch thành công'); revealRecent(created); setSelectedStartTime(null); setDirectNote('')
        setHistoryVersion((value) => value + 1); await loadAvailability()
      },
      onSlotConflict: async () => { setSelectedStartTime(null); setDirectError(SLOT_CONFLICT_MESSAGE); await loadAvailability() },
      onError: (error) => setDirectError(consultationErrorMessage(error)),
    })
    directSubmitting.current = false; setDirectBusy(false)
    return succeeded
  }

  async function submitRandom() {
    if (!specialty || randomSubmitting.current) return false
    randomSubmitting.current = true; setRandomBusy(true); setRandomError(null)
    const succeeded = await runConsultationSubmission({
      submit: () => consultationApi.createRandom({ specialty, note: randomNote }),
      onSuccess: async (created) => {
        showToast('Đã gửi yêu cầu tư vấn'); revealRecent(created); setSpecialty(null); setRandomNote('')
        setHistoryVersion((value) => value + 1)
      },
      onError: (error) => setRandomError(consultationErrorMessage(error)),
    })
    randomSubmitting.current = false; setRandomBusy(false)
    return succeeded
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
        date={date} onDateChange={(value) => { setDate(value); setDirectError(null) }} availability={availability} availabilityLoading={availabilityState === 'loading'} availabilityError={availabilityError} onRetryAvailability={() => void loadAvailability()}
        selectedStartTime={selectedStartTime} onSelectTime={(startTime) => { setSelectedStartTime((current) => current === startTime ? null : startTime); setDirectError(null) }} onClearSelection={() => { setSelectedStartTime(null); setDirectError(null) }} directNote={directNote} onDirectNoteChange={setDirectNote} directError={directError} directBusy={directBusy} onDirectSubmit={submitDirect}
        specialty={specialty} onSpecialtyChange={(value) => { setSpecialty(value); setRandomError(null) }} randomNote={randomNote} onRandomNoteChange={setRandomNote} randomError={randomError} randomBusy={randomBusy} onRandomSubmit={submitRandom}
      />
    </div>
    {recent && <div ref={recentRef} tabIndex={-1} className="consultation-recent-focus"><RecentConsultation item={recent} highlighted={highlightRecent} /></div>}
    <ConsultationHistorySection key={historyVersion} onCancelled={async (item) => { if (item.expertUserId === expertId && item.slot?.date === date) await loadAvailability() }} />
  </main>
}
