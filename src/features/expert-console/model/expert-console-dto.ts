import type { ExpertSpecialty, ExpertStatus } from '@/features/admin/model/admin-experts'
import type { ConsultationStatus, ScheduleSlotState } from './expert-console-types'

export interface ExpertProfileDto {
  user_id: string
  phone: string
  full_name: string
  specialty: ExpertSpecialty
  title: string | null
  workplace: string | null
  years_of_experience: number
  bio: string | null
  avatar_key: string | null
  avatar_url: string | null
  status: ExpertStatus
  average_rating: number
  rating_count: number
  version: number
  created_at: string
  updated_at: string
}

export interface BookingBriefDto {
  request_id: string
  user_display_name: string | null
}

export interface ScheduleSlotDto {
  start_time: string
  end_time: string
  state: ScheduleSlotState
  past: boolean
  booking?: BookingBriefDto
}

export interface DayScheduleDto {
  date: string
  day_off: boolean
  has_bookings: boolean
  slots: ScheduleSlotDto[]
}

export interface DaySummaryDto {
  date: string
  open_count: number
  booked_count: number
  closed_count: number
  day_off: boolean
}

export interface SlotInfoDto {
  id: string
  slot_date: string
  start_time: string
  end_time: string
}

export interface ConsultationDto {
  id: string
  user_id: string
  user_display_name: string | null
  expert_user_id: string | null
  expert_name: string | null
  specialty: ExpertSpecialty
  assignment_type: 'DIRECT' | 'RANDOM'
  status: ConsultationStatus
  slot: SlotInfoDto | null
  note: string | null
  reviewed: boolean
  can_review: boolean
  completed_at: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface ReviewDto {
  id: string
  request_id: string
  user_id: string
  user_display_name?: string | null
  expert_user_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface PageDto<T> {
  items: T[]
  page: number
  page_size: number
  total_items: number
  total_pages: number
}

