import type {
  ConsultationExpertDto,
  ConsultationPageDto,
  ConsultationRequestDto,
  ConsultationSlotDto,
  CreateConsultationReviewDto,
  CreateDirectConsultationDto,
  CreateRandomConsultationDto,
} from './consultation-dto'
import type {
  ConsultationExpert,
  ConsultationPage,
  ConsultationRequest,
  ConsultationReviewInput,
  ConsultationSlot,
  DirectConsultationInput,
  RandomConsultationInput,
} from './consultation-types'

function optionalText(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized || null
}

function optionalPayloadText(value: string | undefined) {
  const normalized = value?.trim()
  return normalized || undefined
}

export function mapConsultationExpert(dto: ConsultationExpertDto): ConsultationExpert {
  return {
    userId: dto.user_id,
    fullName: dto.full_name.trim() || 'Chuyên gia NutriMom',
    specialty: dto.specialty,
    title: optionalText(dto.title),
    workplace: optionalText(dto.workplace),
    yearsOfExperience: dto.years_of_experience,
    bio: optionalText(dto.bio),
    avatarUrl: optionalText(dto.avatar_url),
    averageRating: Number(dto.average_rating),
    ratingCount: dto.rating_count,
  }
}

export function mapConsultationSlot(dto: ConsultationSlotDto): ConsultationSlot {
  return {
    id: dto.id,
    expertUserId: dto.expert_user_id,
    date: dto.slot_date,
    startTime: dto.start_time,
    endTime: dto.end_time,
    status: dto.status,
  }
}

export function mapConsultationRequest(dto: ConsultationRequestDto): ConsultationRequest {
  return {
    id: dto.id,
    userId: dto.user_id,
    userDisplayName: optionalText(dto.user_display_name),
    expertUserId: optionalText(dto.expert_user_id),
    expertName: optionalText(dto.expert_name),
    specialty: dto.specialty,
    assignmentType: dto.assignment_type,
    status: dto.status,
    slot: dto.slot ? {
      id: dto.slot.id,
      date: dto.slot.slot_date,
      startTime: dto.slot.start_time,
      endTime: dto.slot.end_time,
    } : null,
    note: optionalText(dto.note),
    reviewed: dto.reviewed,
    canReview: dto.can_review,
    completedAt: dto.completed_at,
    version: dto.version,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export function mapConsultationPage(dto: ConsultationPageDto): ConsultationPage {
  return {
    items: dto.items.map(mapConsultationRequest),
    page: dto.page,
    pageSize: dto.page_size,
    totalItems: dto.total_items,
    totalPages: dto.total_pages,
  }
}

export function serializeDirectConsultation(input: DirectConsultationInput): CreateDirectConsultationDto {
  return {
    assignment_type: 'DIRECT',
    expert_user_id: input.expertUserId,
    slot_id: input.slotId,
    ...(optionalPayloadText(input.note) ? { note: optionalPayloadText(input.note) } : {}),
  }
}

export function serializeRandomConsultation(input: RandomConsultationInput): CreateRandomConsultationDto {
  return {
    assignment_type: 'RANDOM',
    specialty: input.specialty,
    ...(optionalPayloadText(input.note) ? { note: optionalPayloadText(input.note) } : {}),
  }
}

export function serializeConsultationReview(input: ConsultationReviewInput): CreateConsultationReviewDto {
  return {
    rating: input.rating,
    ...(optionalPayloadText(input.comment) ? { comment: optionalPayloadText(input.comment) } : {}),
  }
}
