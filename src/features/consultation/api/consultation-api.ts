import { apiClient } from '@/core/api/api-client'
import type { ConsultationPageDto, ConsultationRequestDto, ConsultationReviewDto, ConsultationExpertDto, DayAvailabilityDto } from '../model/consultation-dto'
import { mapConsultationExpert, mapConsultationPage, mapConsultationRequest, mapDayAvailability, serializeConsultationReview, serializeDirectConsultation, serializeRandomConsultation } from '../model/consultation-mappers'
import { buildAvailabilityQuery, buildConsultationListQuery } from '../model/consultation-query'
import type { ConsultationReviewInput, DirectConsultationInput, RandomConsultationInput } from '../model/consultation-types'

export const consultationApi = {
  async expert(userId: string, signal?: AbortSignal) {
    const dto = await apiClient.request<ConsultationExpertDto>(`/experts/${encodeURIComponent(userId)}`, { signal })
    return mapConsultationExpert(dto)
  },
  async availability(userId: string, date: string, signal?: AbortSignal) {
    const dto = await apiClient.request<DayAvailabilityDto>(`/experts/${encodeURIComponent(userId)}/availability${buildAvailabilityQuery(date)}`, { signal })
    return mapDayAvailability(dto)
  },
  async createDirect(input: DirectConsultationInput) {
    const dto = await apiClient.request<ConsultationRequestDto>('/consultation-requests', {
      method: 'POST', body: JSON.stringify(serializeDirectConsultation(input)),
    })
    return mapConsultationRequest(dto)
  },
  async createRandom(input: RandomConsultationInput) {
    const dto = await apiClient.request<ConsultationRequestDto>('/consultation-requests', {
      method: 'POST', body: JSON.stringify(serializeRandomConsultation(input)),
    })
    return mapConsultationRequest(dto)
  },
  async list(page: number, pageSize: number, signal?: AbortSignal) {
    const dto = await apiClient.request<ConsultationPageDto>(`/consultation-requests${buildConsultationListQuery(page, pageSize)}`, { signal })
    return mapConsultationPage(dto)
  },
  async get(id: string, signal?: AbortSignal) {
    const dto = await apiClient.request<ConsultationRequestDto>(`/consultation-requests/${encodeURIComponent(id)}`, { signal })
    return mapConsultationRequest(dto)
  },
  async cancel(id: string) {
    const dto = await apiClient.request<ConsultationRequestDto>(`/consultation-requests/${encodeURIComponent(id)}/cancel`, { method: 'POST' })
    return mapConsultationRequest(dto)
  },
  review(id: string, input: ConsultationReviewInput) {
    return apiClient.request<ConsultationReviewDto>(`/consultation-requests/${encodeURIComponent(id)}/review`, {
      method: 'POST', body: JSON.stringify(serializeConsultationReview(input)),
    })
  },
}
