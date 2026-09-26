import type { ConsultationDto, ExpertProfileDto, PageDto, ReviewDto, SlotDto, SlotInfoDto } from './expert-console-dto'
import type { Consultation, ExpertProfile, ExpertReview, ExpertSlot, Page } from './expert-console-types'

export function mapExpertProfile(dto: ExpertProfileDto): ExpertProfile {
  return {
    userId: dto.user_id,
    phone: dto.phone,
    fullName: dto.full_name,
    specialty: dto.specialty,
    title: dto.title,
    workplace: dto.workplace,
    yearsOfExperience: dto.years_of_experience,
    bio: dto.bio,
    avatarUrl: dto.avatar_url,
    status: dto.status,
    averageRating: Number(dto.average_rating),
    ratingCount: dto.rating_count,
  }
}

export function mapSlot(dto: SlotDto): ExpertSlot {
  return { id: dto.id, date: dto.slot_date, startTime: dto.start_time, endTime: dto.end_time, status: dto.status }
}

function mapSlotInfo(dto: SlotInfoDto | null): Consultation['slot'] {
  return dto ? { id: dto.id, date: dto.slot_date, startTime: dto.start_time, endTime: dto.end_time } : null
}

export function mapConsultation(dto: ConsultationDto): Consultation {
  return {
    id: dto.id,
    userId: dto.user_id,
    userDisplayName: dto.user_display_name,
    specialty: dto.specialty,
    assignmentType: dto.assignment_type,
    status: dto.status,
    slot: mapSlotInfo(dto.slot),
    note: dto.note,
    completedAt: dto.completed_at,
    createdAt: dto.created_at,
  }
}

export function mapReview(dto: ReviewDto): ExpertReview {
  return { id: dto.id, requestId: dto.request_id, userId: dto.user_id, rating: dto.rating, comment: dto.comment, createdAt: dto.created_at }
}

export function mapPage<TDto, T>(dto: PageDto<TDto>, mapper: (item: TDto) => T): Page<T> {
  return {
    items: dto.items.map(mapper),
    page: dto.page,
    pageSize: dto.page_size,
    totalItems: dto.total_items,
    totalPages: dto.total_pages,
  }
}

