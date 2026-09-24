import { apiClient } from '@/core/api/api-client'
import type { ConsultationDto, CreateSlotDto, ExpertProfileDto, PageDto, ReviewDto, SlotDto } from '../model/expert-console-dto'
import { mapConsultation, mapExpertProfile, mapPage, mapReview, mapSlot } from '../model/expert-console-mappers'
import { buildConsultationQuery, buildReviewQuery, buildSlotQuery } from '../model/expert-console-query'
import type { ConsultationQuery, ExpertOverview, ReviewQuery, SlotQuery } from '../model/expert-console-types'

const PAGE_SIZE = 20

async function profile(signal?: AbortSignal) {
  return mapExpertProfile(await apiClient.request<ExpertProfileDto>('/expert/me', { signal }))
}

async function slots(query: SlotQuery = {}, signal?: AbortSignal) {
  const data = await apiClient.request<SlotDto[]>(`/expert/slots${buildSlotQuery(query)}`, { signal })
  return data.map(mapSlot)
}

async function createSlot(input: CreateSlotDto) {
  return mapSlot(await apiClient.request<SlotDto>('/expert/slots', { method: 'POST', body: JSON.stringify(input) }))
}

async function deleteSlot(slotId: string) {
  await apiClient.request<void>(`/expert/slots/${encodeURIComponent(slotId)}`, { method: 'DELETE' })
}

async function consultations(query: ConsultationQuery, signal?: AbortSignal) {
  const data = await apiClient.request<PageDto<ConsultationDto>>(`/expert/consultation-requests${buildConsultationQuery(query)}`, { signal })
  return mapPage(data, mapConsultation)
}

async function acceptConsultation(requestId: string, slotId: string) {
  return mapConsultation(await apiClient.request<ConsultationDto>(`/expert/consultation-requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST', body: JSON.stringify({ slot_id: slotId }),
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
  const [assigned, pool, openSlots] = await Promise.all([
    consultations({ type: 'assigned', page: 1, pageSize: 1 }, signal),
    consultations({ type: 'pool', page: 1, pageSize: 1 }, signal),
    slots({ status: 'OPEN' }, signal),
  ])
  return { upcomingConsultations: assigned.totalItems, pendingRequests: pool.totalItems, openSlots: openSlots.length }
}

export const expertConsoleApi = {
  profile, slots, createSlot, deleteSlot, consultations, acceptConsultation, completeConsultation, reviews, overview,
  pageSize: PAGE_SIZE,
}

