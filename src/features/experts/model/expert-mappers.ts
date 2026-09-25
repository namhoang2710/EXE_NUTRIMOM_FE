import type { ExpertSummaryDto } from './expert-dto'
import type { Expert } from './expert-types'

function safeText(value: string | null, fallback: string) {
  const normalized = value?.trim()
  return normalized || fallback
}

function safeNonNegativeNumber(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

export function mapExpertSummary(dto: ExpertSummaryDto): Expert {
  return {
    userId: dto.user_id,
    fullName: safeText(dto.full_name, 'Chuyên gia NutriMom'),
    specialty: dto.specialty,
    title: safeText(dto.title, 'Bác sĩ / Chuyên gia'),
    workplace: safeText(dto.workplace, 'Đang cập nhật nơi công tác'),
    yearsOfExperience: Math.round(safeNonNegativeNumber(dto.years_of_experience)),
    avatarUrl: dto.avatar_url?.trim() || null,
    averageRating: Math.min(5, safeNonNegativeNumber(dto.average_rating)),
    ratingCount: Math.round(safeNonNegativeNumber(dto.rating_count)),
  }
}
