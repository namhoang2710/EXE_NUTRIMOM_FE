import { ArrowClockwise, Heart, MagnifyingGlass, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ExpertAdDialog } from '../components/ExpertAdDialog'
import { ExpertCard } from '../components/ExpertCard'
import { ExpertListSkeleton } from '../components/ExpertListSkeleton'
import { useExperts } from '../hooks/useExperts'
import type { ExpertSpecialty } from '../model/expert-types'
import { expertSpecialtyLabels } from '../model/expert-types'
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

  function handleBook(expertUserId: string) {
    const bookingPath = `/app/consultations?expertUserId=${encodeURIComponent(expertUserId)}`
    if (status !== 'authenticated') {
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
      <section className="experts-hero" aria-labelledby="experts-title">
        <div className="experts-hero__glow" aria-hidden="true" />
        <div className="experts-container experts-hero__content">
          <div className="experts-hero__copy">
            <p className="experts-eyebrow"><Sparkle size={17} weight="fill" aria-hidden="true" />Đội ngũ đồng hành đáng tin cậy</p>
            <h1 id="experts-title">Danh sách bác sĩ - chuyên gia</h1>
            <p>Gặp gỡ đội ngũ chuyên gia giàu kinh nghiệm, sẵn sàng lắng nghe và đồng hành cùng mẹ trong từng chặng của hành trình.</p>
          </div>
          <div className="experts-hero__trust" aria-label="Cam kết từ NutriMom">
            <span><ShieldCheck size={23} weight="duotone" aria-hidden="true" />Hồ sơ được xác thực</span>
            <span><Heart size={23} weight="duotone" aria-hidden="true" />Tư vấn tận tâm</span>
          </div>
        </div>
      </section>

      <section className="experts-directory" aria-labelledby="experts-directory-title">
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
                <ExpertCard key={expert.userId} expert={expert} index={index} onBook={handleBook} />
              ))}
            </div>
          )}
        </div>
      </section>

      <ExpertAdDialog open={adOpen && status === 'anonymous'} onClose={closeAd} onBannerClick={handleBannerClick} />
    </main>
  )
}
