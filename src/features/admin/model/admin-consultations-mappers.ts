import type {
  AdminConsultation,
  AdminConsultationAssignmentType,
  AdminConsultationPage,
  AdminConsultationSpecialty,
} from './admin-consultations'

export interface AdminConsultationSlotDto {
  id: string
  slot_date: string
  start_time: string
  end_time: string
}
export interface AdminConsultationReviewDto {
  id: string
  request_id: string
  user_id: string
  user_display_name: string | null
  expert_user_id: string
  rating: number
  comment: string | null
  created_at: string
}
export interface AdminConsultationDto {
  id: string
  user_id: string
  user_display_name: string | null
  expert_user_id: string | null
  expert_name: string | null
  specialty: AdminConsultationSpecialty
  assignment_type: AdminConsultationAssignmentType
  status: 'COMPLETED'
  slot: AdminConsultationSlotDto | null
  completed_at: string | null
  created_at: string
  review: AdminConsultationReviewDto | null
}

export interface AdminConsultationPageDto {
  items: AdminConsultationDto[]
  page: number
  page_size: number
  total_items: number
  total_pages: number
}

export class AdminConsultationContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminConsultationContractError'
  }
}

function validateReview(review: AdminConsultationReviewDto) {
  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) {
    throw new AdminConsultationContractError(`Consultation review ${review.id} has an invalid rating.`)
  }
}

export function mapAdminConsultation(dto: AdminConsultationDto): AdminConsultation {
  if (dto.status !== 'COMPLETED') {
    throw new AdminConsultationContractError(`Consultation ${dto.id} is not completed.`)
  }
  if (dto.review) validateReview(dto.review)

  return {
    id: dto.id,
    userId: dto.user_id,
    userDisplayName: dto.user_display_name,
    expertUserId: dto.expert_user_id,
    expertName: dto.expert_name,
    specialty: dto.specialty,
    assignmentType: dto.assignment_type,
    status: dto.status,
    slot: dto.slot ? {
      id: dto.slot.id,
      slotDate: dto.slot.slot_date,
      startTime: dto.slot.start_time,
      endTime: dto.slot.end_time,
    } : null,
    completedAt: dto.completed_at,
    createdAt: dto.created_at,
    review: dto.review ? {
      id: dto.review.id,
      requestId: dto.review.request_id,
      userId: dto.review.user_id,
      userDisplayName: dto.review.user_display_name,
      expertUserId: dto.review.expert_user_id,
      rating: dto.review.rating,
      comment: dto.review.comment,
      createdAt: dto.review.created_at,
    } : null,
  }
}

export function mapAdminConsultationsPage(dto: AdminConsultationPageDto): AdminConsultationPage {
  const items: AdminConsultation[] = []
  let invalidItems = 0

  for (const item of dto.items) {
    try {
      items.push(mapAdminConsultation(item))
    } catch (error) {
      if (!(error instanceof AdminConsultationContractError)) throw error
      invalidItems += 1
    }
  }

  return {
    items,
    page: dto.page,
    pageSize: dto.page_size,
    totalItems: dto.total_items,
    totalPages: dto.total_pages,
    invalidItems,
  }
}

