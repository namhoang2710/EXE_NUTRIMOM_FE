export type ConsultationSpecialtyDto = 'PSYCHOLOGY' | 'OBSTETRICS' | 'HEALTH'
export type ConsultationAssignmentTypeDto = 'DIRECT' | 'RANDOM'
export type ConsultationStatusDto = 'PENDING_EXPERT' | 'PENDING_CONSULTATION' | 'COMPLETED' | 'CANCELLED'
import type { UnavailableReason } from './slot-grid'

export interface ConsultationExpertDto {
  user_id: string
  full_name: string
  specialty: ConsultationSpecialtyDto
  title: string | null
  workplace: string | null
  years_of_experience: number
  bio: string | null
  avatar_url: string | null
  average_rating: number
  rating_count: number
}

export interface DayAvailabilityDto {
  date: string
  day_off: boolean
  slots: Array<{
  start_time: string
  end_time: string
    available: boolean
    reason?: UnavailableReason
  }>
}

export interface ConsultationSlotInfoDto {
  id: string
  slot_date: string
  start_time: string
  end_time: string
}

export interface ConsultationRequestDto {
  id: string
  user_id: string
  user_display_name: string | null
  expert_user_id: string | null
  expert_name: string | null
  specialty: ConsultationSpecialtyDto
  assignment_type: ConsultationAssignmentTypeDto
  status: ConsultationStatusDto
  slot: ConsultationSlotInfoDto | null
  note: string | null
  reviewed: boolean
  can_review: boolean
  completed_at: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface ConsultationPageDto {
  items: ConsultationRequestDto[]
  page: number
  page_size: number
  total_items: number
  total_pages: number
}

export interface ConsultationReviewDto {
  id: string
  request_id: string
  user_id: string
  expert_user_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface CreateDirectConsultationDto {
  assignment_type: 'DIRECT'
  expert_user_id: string
  slot_date: string
  start_time: string
  note?: string
}

export interface CreateRandomConsultationDto {
  assignment_type: 'RANDOM'
  specialty: ConsultationSpecialtyDto
  note?: string
}

export interface CreateConsultationReviewDto {
  rating: number
  comment?: string
}
