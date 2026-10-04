import type { ConsultationDto, DayScheduleDto, DaySummaryDto, ExpertProfileDto, PageDto, ReviewDto, ScheduleSlotDto, SlotInfoDto } from './expert-console-dto'
import type { Consultation, DaySchedule, DaySummary, ExpertProfile, ExpertReview, Page, ScheduleSlot } from './expert-console-types'
import { normalizeSlotTime } from '../../consultation/model/slot-grid.ts'

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

export function mapScheduleSlot(dto: ScheduleSlotDto): ScheduleSlot {
  return {
    startTime: normalizeSlotTime(dto.start_time),
    endTime: normalizeSlotTime(dto.end_time),
    state: dto.state,
    past: dto.past,
    booking: dto.booking ? { requestId: dto.booking.request_id, userDisplayName: dto.booking.user_display_name ?? null } : null,
  }
}

export function mapDaySchedule(dto: DayScheduleDto): DaySchedule {
  return { date: dto.date, dayOff: dto.day_off, hasBookings: dto.has_bookings, slots: dto.slots.map(mapScheduleSlot) }
}

export function mapDaySummary(dto: DaySummaryDto): DaySummary {
  return { date: dto.date, openCount: dto.open_count, bookedCount: dto.booked_count, closedCount: dto.closed_count, dayOff: dto.day_off }
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
  return { id: dto.id, requestId: dto.request_id, userId: dto.user_id, userDisplayName: dto.user_display_name?.trim() || null, rating: dto.rating, comment: dto.comment, createdAt: dto.created_at }
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

