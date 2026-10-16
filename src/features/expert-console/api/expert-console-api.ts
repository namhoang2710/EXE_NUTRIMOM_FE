import { getSessionScope } from '@/core/auth/token-store'
import { requireCurrentScope } from '@/core/api/profile-requests'
import { apiClient } from '@/core/api/api-client'
import type { ConsultationDto, ConsultationPageDto, DayScheduleDto, DaySummaryDto, ExpertProfileDto, PageDto, ReviewDto, ScheduleSlotDto } from '../model/expert-console-dto'
import { mapConsultation, mapConsultationPage, mapDaySchedule, mapDaySummary, mapExpertProfile, mapPage, mapReview, mapScheduleSlot } from '../model/expert-console-mappers'
import { buildConsultationQuery, buildReviewQuery, toQueryString } from '../model/expert-console-query'
import { expertReadCoordinator } from '../model/expert-read-coordinator'
import type { ConsultationQuery, ExpertOverview, ReviewQuery } from '../model/expert-console-types'
import { toApiSlotTime, vietnamToday } from '@/features/consultation/model/slot-grid'

const PAGE_SIZE = 20
function coordinatedRead<T>(key:string,loader:()=>Promise<T>,signal?:AbortSignal){
  expertReadCoordinator.setScope(getSessionScope())
  return expertReadCoordinator.run(key,loader,signal,key==='profile'?300_000:20_000)
}
async function mutate<T>(action:()=>Promise<T>){
  const scope=getSessionScope();expertReadCoordinator.setScope(scope);expertReadCoordinator.assertAvailable()
  try{const result=await action();requireCurrentScope(scope);expertReadCoordinator.invalidate('consultations');expertReadCoordinator.invalidate('schedule');return result}
  catch(error){if(scope===getSessionScope()){expertReadCoordinator.recordFailure(error);if(error&&typeof error==='object'&&'status' in error&&error.status===409){expertReadCoordinator.invalidate('consultations');expertReadCoordinator.invalidate('schedule')}}throw error}
}
if(typeof window!=='undefined')for(const event of ['nutrimom:session-cleared','nutrimom:session-changed'])window.addEventListener(event,()=>expertReadCoordinator.clear())

async function profile(signal?: AbortSignal) {
  return coordinatedRead('profile', async () => mapExpertProfile(await apiClient.request<ExpertProfileDto>('/expert/me')), signal)
}

async function schedule(date: string, signal?: AbortSignal) {
  const query = toQueryString({ date })
  return coordinatedRead(`schedule${query}`, async () => {
    const data = await apiClient.request<DayScheduleDto>(`/expert/schedule${query}`)
    return mapDaySchedule(data)
  }, signal)
}

async function scheduleSummary(from: string, to: string, signal?: AbortSignal) {
  const query = toQueryString({ from, to })
  return coordinatedRead(`schedule-summary${query}`, async () => {
    const data = await apiClient.request<DaySummaryDto[]>(`/expert/schedule/summary${query}`)
    return data.map(mapDaySummary)
  }, signal)
}

async function toggleSlot(date: string, startTime: string, closed: boolean) {
  const data = await mutate(()=>apiClient.request<ScheduleSlotDto>('/expert/schedule/slot', {
    method: 'PUT', body: JSON.stringify({ slot_date: date, start_time: toApiSlotTime(startTime), closed }),
  }))
  return mapScheduleSlot(data)
}

async function toggleDayOff(date: string, dayOff: boolean) {
  const data = await mutate(()=>apiClient.request<DayScheduleDto>('/expert/schedule/day-off', {
    method: 'PUT', body: JSON.stringify({ slot_date: date, day_off: dayOff }),
  }))
  return mapDaySchedule(data)
}

async function consultations(query: ConsultationQuery, signal?: AbortSignal) {
  const queryString = buildConsultationQuery(query)
  return coordinatedRead(`consultations${queryString}`, async () => {
    const data = await apiClient.request<ConsultationPageDto>(`/expert/consultation-requests${queryString}`)
    return mapConsultationPage(data)
  }, signal)
}

async function acceptConsultation(requestId: string, date: string, startTime: string) {
  return mapConsultation(await mutate(()=>apiClient.request<ConsultationDto>(`/expert/consultation-requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST', body: JSON.stringify({ slot_date: date, start_time: toApiSlotTime(startTime) }),
  })))
}

async function completeConsultation(requestId: string) {
  return mapConsultation(await mutate(()=>apiClient.request<ConsultationDto>(`/expert/consultation-requests/${encodeURIComponent(requestId)}/complete`, { method: 'POST' })))
}

async function reviews(query: ReviewQuery, signal?: AbortSignal) {
  const queryString = buildReviewQuery(query)
  return coordinatedRead(`reviews${queryString}`, async () => {
    const data = await apiClient.request<PageDto<ReviewDto>>(`/expert/reviews${queryString}`)
    return mapPage(data, mapReview)
  }, signal)
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

