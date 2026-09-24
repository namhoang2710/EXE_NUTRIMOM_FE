import type { ExpertSpecialty, ExpertStatus } from '@/features/admin/model/admin-experts'

export type SlotStatus = 'OPEN' | 'BOOKED'
export type ConsultationStatus = 'PENDING_EXPERT' | 'PENDING_CONSULTATION' | 'COMPLETED' | 'CANCELLED'
export type ConsultationType = 'assigned' | 'pool'
export type ReviewSort = 'newest' | 'rating_desc' | 'rating_asc'

export interface ExpertProfile {
  userId: string
  phone: string
  fullName: string
  specialty: ExpertSpecialty
  title: string | null
  workplace: string | null
  yearsOfExperience: number
  bio: string | null
  avatarUrl: string | null
  status: ExpertStatus
  averageRating: number
  ratingCount: number
}

export interface ExpertSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  status: SlotStatus
}

export interface Consultation {
  id: string
  userId: string
  userDisplayName: string
  specialty: ExpertSpecialty
  assignmentType: 'DIRECT' | 'RANDOM'
  status: ConsultationStatus
  slot: Omit<ExpertSlot, 'status'> | null
  note: string | null
  completedAt: string | null
  createdAt: string
}

export interface ExpertReview {
  id: string
  requestId: string
  userId: string
  rating: number
  comment: string | null
  createdAt: string
}

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface DateRangeQuery {
  from?: string
  to?: string
}

export interface SlotQuery extends DateRangeQuery {
  date?: string
  status?: SlotStatus
}

export interface ConsultationQuery extends DateRangeQuery {
  type: ConsultationType
  status?: ConsultationStatus
  query?: string
  page: number
  pageSize: number
}

export interface ReviewQuery extends DateRangeQuery {
  rating?: number
  hasComment?: boolean
  sort: ReviewSort
  page: number
  pageSize: number
}

export interface ExpertOverview {
  upcomingConsultations: number
  pendingRequests: number
  openSlots: number
}

export const specialtyLabels: Record<ExpertSpecialty, string> = {
  PSYCHOLOGY: 'Tâm lý',
  OBSTETRICS: 'Sản khoa',
  HEALTH: 'Sức khỏe',
}

export const consultationStatusLabels: Record<ConsultationStatus, string> = {
  PENDING_EXPERT: 'Chờ chuyên gia',
  PENDING_CONSULTATION: 'Sắp tư vấn',
  COMPLETED: 'Đã hoàn tất',
  CANCELLED: 'Đã hủy',
}

