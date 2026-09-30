export type ConsultationSpecialty = 'PSYCHOLOGY' | 'OBSTETRICS' | 'HEALTH'
export type ConsultationAssignmentType = 'DIRECT' | 'RANDOM'
export type ConsultationStatus = 'PENDING_EXPERT' | 'PENDING_CONSULTATION' | 'COMPLETED' | 'CANCELLED'
import type { UnavailableReason } from './slot-grid'

export interface ConsultationExpert {
  userId: string
  fullName: string
  specialty: ConsultationSpecialty
  title: string | null
  workplace: string | null
  yearsOfExperience: number
  bio: string | null
  avatarUrl: string | null
  averageRating: number
  ratingCount: number
}

export interface AvailabilitySlot {
  startTime: string
  endTime: string
  available: boolean
  reason?: UnavailableReason
}

export interface DayAvailability {
  date: string
  dayOff: boolean
  slots: AvailabilitySlot[]
}

export interface ConsultationSlotInfo {
  id: string
  date: string
  startTime: string
  endTime: string
}

export interface ConsultationRequest {
  id: string
  userId: string
  userDisplayName: string | null
  expertUserId: string | null
  expertName: string | null
  specialty: ConsultationSpecialty
  assignmentType: ConsultationAssignmentType
  status: ConsultationStatus
  slot: ConsultationSlotInfo | null
  note: string | null
  reviewed: boolean
  canReview: boolean
  completedAt: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export interface ConsultationPage {
  items: ConsultationRequest[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface DirectConsultationInput {
  expertUserId: string
  date: string
  startTime: string
  note?: string
}

export interface RandomConsultationInput {
  specialty: ConsultationSpecialty
  note?: string
}

export interface ConsultationReviewInput {
  rating: number
  comment?: string
}

export const consultationSpecialtyLabels: Record<ConsultationSpecialty, string> = {
  PSYCHOLOGY: 'Tâm lý',
  OBSTETRICS: 'Sản khoa',
  HEALTH: 'Sức khỏe',
}

export const consultationStatusLabels: Record<ConsultationStatus, string> = {
  PENDING_EXPERT: 'Đang chờ chuyên gia',
  PENDING_CONSULTATION: 'Đã đặt lịch',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
}

export const consultationAssignmentLabels: Record<ConsultationAssignmentType, string> = {
  DIRECT: 'Chọn chuyên gia',
  RANDOM: 'Ghép theo chuyên khoa',
}
