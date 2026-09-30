import { apiClient } from '@/core/api/api-client'
import type { ConsultationDto, DayScheduleDto, DaySummaryDto, ExpertProfileDto, PageDto, ReviewDto, ScheduleSlotDto } from '../model/expert-console-dto'
import { mapConsultation, mapDaySchedule, mapDaySummary, mapExpertProfile, mapPage, mapReview, mapScheduleSlot } from '../model/expert-console-mappers'
import { buildConsultationQuery, buildReviewQuery, toQueryString } from '../model/expert-console-query'
import type { ConsultationQuery, ExpertOverview, ReviewQuery } from '../model/expert-console-types'
import { toApiSlotTime, vietnamToday } from '@/features/consultation/model/slot-grid'

const PAGE_SIZE = 20

async function profile(signal?: AbortSignal) {
  return mapExpertProfile(await apiClient.request<ExpertProfileDto>('/expert/me', { signal }))
}

async function schedule(date: string, signal?: AbortSignal) {
  const data = await apiClient.request<DayScheduleDto>(`/expert/schedule${toQueryString({ date })}`, { signal })
  return mapDaySchedule(data)
}

async function scheduleSummary(from: string, to: string, signal?: AbortSignal) {
  const data = await apiClient.request<DaySummaryDto[]>(`/expert/schedule/summary${toQueryString({ from, to })}`, { signal })
  return data.map(mapDaySummary)
}

async function toggleSlot(date: string, startTime: string, closed: boolean) {
  const data = await apiClient.request<ScheduleSlotDto>('/expert/schedule/slot', {
    method: 'PUT', body: JSON.stringify({ slot_date: date, start_time: toApiSlotTime(startTime), closed }),
  })
  return mapScheduleSlot(data)
}

async function toggleDayOff(date: string, dayOff: boolean) {
  const data = await apiClient.request<DayScheduleDto>('/expert/schedule/day-off', {
    method: 'PUT', body: JSON.stringify({ slot_date: date, day_off: dayOff }),
  })
  return mapDaySchedule(data)
}

async function consultations(query: ConsultationQuery, signal?: AbortSignal) {
  const data = await apiClient.request<PageDto<ConsultationDto>>(`/expert/consultation-requests${buildConsultationQuery(query)}`, { signal })
  return mapPage(data, mapConsultation)
}

async function acceptConsultation(requestId: string, date: string, startTime: string) {
  return mapConsultation(await apiClient.request<ConsultationDto>(`/expert/consultation-requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST', body: JSON.stringify({ slot_date: date, start_time: toApiSlotTime(startTime) }),
  }))
}

async function completeConsultation(requestId: string) {
  return mapConsultation(await apiClient.request<ConsultationDto>(`/expert/consultation-requests/${encodeURIComponent(requestId)}/complete`, { method: 'POST' }))
}

async function reviews(query: ReviewQuery, signal?: AbortSignal) {
  const data = await apiClient.request<PageDto<ReviewDto>>(`/expert/reviews${buildReviewQuery(query)}`, { signal })
  return mapPage(data, mapReview)
}

async function overview(signal?: AbortSignal): Promise<ExpertOverview> {
  const today = vietnamToday()
  const [assigned, pool, summary] = await Promise.all([
    consultations({ type: 'assigned', status: 'PENDING_CONSULTATION', page: 1, pageSize: 1 }, signal),
    consultations({ type: 'pool', page: 1, pageSize: 1 }, signal),
    scheduleSummary(today, today, signal),
  ])

  return {
    upcomingConsultations: assigned.totalItems,
    pendingRequests: pool.totalItems,
    openToday: summary.find((item) => item.date === today)?.openCount ?? 0,
    today,
  }
}

export const expertConsoleApi = {
  profile, schedule, scheduleSummary, toggleSlot, toggleDayOff, consultations, acceptConsultation, completeConsultation, reviews, overview,
  pageSize: PAGE_SIZE,
}

