export const adminConsultationPageSizes = [10, 20, 50, 100] as const

export type AdminConsultationSpecialty = 'PSYCHOLOGY' | 'OBSTETRICS' | 'HEALTH'
export type AdminConsultationAssignmentType = 'DIRECT' | 'RANDOM'

export interface AdminConsultationSlot {
  id: string
  slotDate: string
  startTime: string
  endTime: string
}
export interface AdminConsultationReview {
  id: string
  requestId: string
  userId: string
  userDisplayName: string | null
  expertUserId: string
  rating: number
  comment: string | null
  createdAt: string
}
export interface AdminConsultation {
  id: string
  userId: string
  userDisplayName: string | null
  expertUserId: string | null
  expertName: string | null
  specialty: AdminConsultationSpecialty
  assignmentType: AdminConsultationAssignmentType
  status: 'COMPLETED'
  slot: AdminConsultationSlot | null
  completedAt: string | null
  createdAt: string
  review: AdminConsultationReview | null
}

export interface AdminConsultationPage {
  items: AdminConsultation[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  invalidItems: number
}

export interface AdminConsultationsQuery {
  page: number
  pageSize: number
  q?: string
}

export const defaultAdminConsultationsQuery: AdminConsultationsQuery = {
  page: 1,
  pageSize: 20,
}

const specialtyLabels: Record<AdminConsultationSpecialty, string> = {
  PSYCHOLOGY: 'Tâm lý',
  OBSTETRICS: 'Chuyên khoa',
  HEALTH: 'Sức khỏe',
}

const assignmentTypeLabels: Record<AdminConsultationAssignmentType, string> = {
  DIRECT: 'Direct',
  RANDOM: 'Random',
}

function boundedInteger(value: string | null, fallback: number, minimum: number, maximum: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback
}

export function readAdminConsultationsQuery(search: URLSearchParams | string): AdminConsultationsQuery {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const q = params.get('q')?.trim()
  return {
    page: boundedInteger(params.get('page'), defaultAdminConsultationsQuery.page, 1, Number.MAX_SAFE_INTEGER),
    pageSize: boundedInteger(params.get('pageSize'), defaultAdminConsultationsQuery.pageSize, 1, 100),
    q: q || undefined,
  }
}

export function toAdminConsultationsSearchParams(query: AdminConsultationsQuery) {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  if (query.q?.trim()) params.set('q', query.q.trim())
  return params
}

export function buildAdminConsultationsQueryString(query: AdminConsultationsQuery) {
  return `?${toAdminConsultationsSearchParams(query).toString()}`
}

export function getAdminConsultationSpecialtyLabel(value: AdminConsultationSpecialty) {
  return specialtyLabels[value]
}

export function getAdminConsultationAssignmentTypeLabel(value: AdminConsultationAssignmentType) {
  return assignmentTypeLabels[value]
}

