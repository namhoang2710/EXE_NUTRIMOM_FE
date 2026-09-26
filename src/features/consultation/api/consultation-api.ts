import { apiClient } from '@/core/api/api-client'
import type { ConsultationPageDto, ConsultationRequestDto, ConsultationReviewDto, ConsultationSlotDto, ConsultationExpertDto } from '../model/consultation-dto'
import { mapConsultationExpert, mapConsultationPage, mapConsultationRequest, mapConsultationSlot, serializeConsultationReview, serializeDirectConsultation, serializeRandomConsultation } from '../model/consultation-mappers'
import { buildConsultationListQuery, buildExpertSlotsQuery } from '../model/consultation-query'
import type { ConsultationReviewInput, DirectConsultationInput, RandomConsultationInput } from '../model/consultation-types'

export const consultationApi = {
  async expert(userId: string, signal?: AbortSignal) {
    const dto = await apiClient.request<ConsultationExpertDto>(`/experts/${encodeURIComponent(userId)}`, { signal })
    return mapConsultationExpert(dto)
  },
  async slots(userId: string, date: string, signal?: AbortSignal) {
    const dto = await apiClient.request<ConsultationSlotDto[]>(`/experts/${encodeURIComponent(userId)}/slots${buildExpertSlotsQuery(date)}`, { signal })
    return dto.map(mapConsultationSlot)
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
