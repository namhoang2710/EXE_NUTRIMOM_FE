import { Briefcase, CalendarCheck, MapPin, Medal, Star } from '@phosphor-icons/react'
import { useEffect, useState, type CSSProperties } from 'react'
import type { Expert } from '../model/expert-types'
import { expertSpecialtyLabels } from '../model/expert-types'

interface ExpertCardProps {
  expert: Expert
  index: number
  onBook: (expertUserId: string) => void
}

function getInitials(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  return words.slice(-2).map((word) => word[0]?.toLocaleUpperCase('vi')).join('') || 'NM'
}

export function ExpertCard({ expert, index, onBook }: ExpertCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const ratingWidth = `${Math.min(100, Math.max(0, expert.averageRating / 5 * 100))}%`
  const animationStyle = { '--expert-card-index': index } as CSSProperties

  useEffect(() => setImageFailed(false), [expert.avatarUrl])

  return (
    <article className="expert-card" style={animationStyle}>
      <div className="expert-card__portrait">
        {expert.avatarUrl && !imageFailed ? (
          <img
            src={expert.avatarUrl}
            alt={`Ảnh đại diện của ${expert.fullName}`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="expert-card__avatar-fallback" aria-label={`Ảnh đại diện mặc định của ${expert.fullName}`}>
            <span aria-hidden="true">{getInitials(expert.fullName)}</span>
          </div>
        )}
        <span className="expert-card__specialty">{expertSpecialtyLabels[expert.specialty]}</span>
      </div>

      <div className="expert-card__body">
        <div className="expert-card__heading">
          <div>
            <p className="expert-card__title">{expert.title}</p>
            <h2>{expert.fullName}</h2>
          </div>
          <div className="expert-card__rating" aria-label={expert.ratingCount > 0
            ? `${expert.averageRating.toFixed(1)} trên 5 từ ${expert.ratingCount} lượt đánh giá`
            : 'Chưa có đánh giá'}>
            {expert.ratingCount > 0 ? (
              <>
                <div className="expert-rating-stars" aria-hidden="true">
                  <span>★★★★★</span>
                  <span className="expert-rating-stars__fill" style={{ width: ratingWidth }}>★★★★★</span>
                </div>
                <strong>{expert.averageRating.toFixed(1)}/5</strong>
                <span>({expert.ratingCount} lượt đánh giá)</span>
              </>
            ) : (
              <>
                <Star size={17} weight="duotone" aria-hidden="true" />
                <span>Chưa có đánh giá</span>
              </>
            )}
          </div>
        </div>

        <div className="expert-card__details">
          <p><MapPin size={19} weight="duotone" aria-hidden="true" /><span>{expert.workplace}</span></p>
          <p><Medal size={19} weight="duotone" aria-hidden="true" /><span>{expert.yearsOfExperience} năm kinh nghiệm</span></p>
          <p><Briefcase size={19} weight="duotone" aria-hidden="true" /><span>Chuyên khoa {expertSpecialtyLabels[expert.specialty].toLocaleLowerCase('vi')}</span></p>
        </div>

        <div className="expert-card__footer">
          <p><span className="expert-card__status-dot" aria-hidden="true" />Đang nhận lịch tư vấn</p>
          <button type="button" onClick={() => onBook(expert.userId)}>
            <CalendarCheck size={20} weight="bold" aria-hidden="true" />
            Đặt lịch khám
          </button>
        </div>
      </div>
    </article>
  )
}
