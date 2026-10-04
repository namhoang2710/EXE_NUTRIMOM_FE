import { ArrowClockwise, MagnifyingGlass } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ConsultationBannerActions } from '@/features/consultation/components/ConsultationBannerActions'
import { ExpertAdDialog } from '../components/ExpertAdDialog'
import { ExpertCard } from '../components/ExpertCard'
import { ExpertDetailDialog } from '../components/ExpertDetailDialog'
import { ExpertListSkeleton } from '../components/ExpertListSkeleton'
import { expertsApi } from '../api/experts-api'
import { useExperts } from '../hooks/useExperts'
import type { ExpertDetail, ExpertSpecialty } from '../model/expert-types'
import { expertSpecialtyLabels } from '../model/expert-types'
import '@/features/consultation/styles/consultation.css'
import './experts.css'

const specialtyOptions: Array<{ value: ExpertSpecialty | null; label: string }> = [
  { value: null, label: 'Tất cả chuyên khoa' },
  ...Object.entries(expertSpecialtyLabels).map(([value, label]) => ({
    value: value as ExpertSpecialty,
    label,
  })),
]

export function ExpertsPage() {
  const [specialty, setSpecialty] = useState<ExpertSpecialty | null>(null)
  const [adOpen, setAdOpen] = useState(false)
  const [adDismissed, setAdDismissed] = useState(false)
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ExpertDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const { status } = useAuth()
  const { experts, loading, error, retry } = useExperts(specialty)
  const navigate = useNavigate()
  const location = useLocation()

  const closeAd = useCallback(() => {
    setAdOpen(false)
    setAdDismissed(true)
  }, [])

  useEffect(() => {
    if (status !== 'anonymous' || adDismissed) return
    const timer = window.setTimeout(() => setAdOpen(true), 1500)
    return () => window.clearTimeout(timer)
  }, [adDismissed, status])

  const loadDetail = useCallback(async (userId: string, signal?: AbortSignal) => {
    setDetailLoading(true); setDetailError(null)
    try { setDetail(await expertsApi.detail(userId, signal)) }
    catch (error) { if (!signal?.aborted) { setDetail(null); setDetailError(error instanceof Error ? error.message : 'Không thể tải hồ sơ chuyên gia.') } }
    finally { if (!signal?.aborted) setDetailLoading(false) }
  }, [])

  useEffect(() => {
    if (!detailUserId) return
    const controller = new AbortController()
    void loadDetail(detailUserId, controller.signal)
    return () => controller.abort()
  }, [detailUserId, loadDetail])

  function handleBook(expertUserId: string) {
    if (status === 'loading') return
    const bookingPath = `/app/consultations?expertUserId=${encodeURIComponent(expertUserId)}`
    if (status === 'anonymous') {
      navigate('/login', { state: { from: bookingPath, expertUserId } })
      return
    }
    navigate(bookingPath, { state: { expertUserId } })
  }

  function handleBannerClick() {
    closeAd()
    navigate('/login', {
      state: { from: `${location.pathname}${location.search}${location.hash}` },
    })
  }

  return (
    <main className="experts-page">
      <section className="consultation-banner" aria-labelledby="experts-banner-title">
        <img src="/bannerbook.jpg" alt="" fetchPriority="high" />
        <span className="consultation-banner__overlay" aria-hidden="true" />
        <h1 id="experts-banner-title">Đăng ký tư vấn</h1>
        <ConsultationBannerActions randomBookingTo="/app/consultations?mode=random#consultation-booking-form" expertsTo={`${location.pathname}#expert-directory`} />
      </section>

      <section id="expert-directory" className="experts-directory" aria-labelledby="experts-directory-title">
        <div className="experts-container">
          <div className="experts-toolbar">
            <div>
              <p className="experts-toolbar__eyebrow">Chọn người đồng hành phù hợp</p>
              <h2 id="experts-directory-title">Chuyên gia dành cho mẹ</h2>
            </div>
            <div className="experts-filters" aria-label="Lọc theo chuyên khoa">
              {specialtyOptions.map((option) => (
                <button
                  key={option.value ?? 'ALL'}
                  type="button"
                  className={specialty === option.value ? 'is-active' : undefined}
                  aria-pressed={specialty === option.value}
                  onClick={() => setSpecialty(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? <ExpertListSkeleton /> : error ? (
            <div className="experts-state" role="alert">
              <span className="experts-state__icon"><ArrowClockwise size={27} weight="duotone" aria-hidden="true" /></span>
              <h2>Danh sách chưa thể hiển thị</h2>
              <p>{error}</p>
              <button type="button" onClick={() => void retry()}>
                <ArrowClockwise size={18} weight="bold" aria-hidden="true" />Thử lại
              </button>
            </div>
          ) : experts.length === 0 ? (
            <div className="experts-state">
              <span className="experts-state__icon"><MagnifyingGlass size={27} weight="duotone" aria-hidden="true" /></span>
              <h2>Chưa có chuyên gia phù hợp</h2>
              <p>NutriMom đang cập nhật đội ngũ chuyên gia. Mẹ vui lòng quay lại sau nhé.</p>
              {specialty && <button type="button" onClick={() => setSpecialty(null)}>Xem tất cả chuyên khoa</button>}
            </div>
          ) : (
            <div className="expert-list">
              {experts.map((expert, index) => (
                <ExpertCard key={expert.userId} expert={expert} index={index} onOpen={setDetailUserId} onBook={handleBook} bookingDisabled={status === 'loading'} />
              ))}
            </div>
          )}
        </div>
      </section>

      <ExpertAdDialog open={adOpen && status === 'anonymous'} onClose={closeAd} onBannerClick={handleBannerClick} />
      <ExpertDetailDialog open={Boolean(detailUserId)} expert={detail} loading={detailLoading} error={detailError} bookingDisabled={status === 'loading'} onClose={() => setDetailUserId(null)} onRetry={() => { if (detailUserId) void loadDetail(detailUserId) }} onBook={() => { if (detailUserId) handleBook(detailUserId) }} />
    </main>
  )
}
