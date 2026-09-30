import { apiClient } from '@/core/api/api-client'
import type { ExpertDetailDto, ExpertSummaryDto } from '../model/expert-dto'
import { mapExpertDetail, mapExpertSummary } from '../model/expert-mappers'
import type { Expert, ExpertDetail, ExpertSpecialty } from '../model/expert-types'

async function list(specialty: ExpertSpecialty | null, signal?: AbortSignal): Promise<Expert[]> {
  const query = specialty ? `?specialty=${encodeURIComponent(specialty)}` : ''
  const response = await apiClient.request<ExpertSummaryDto[]>(`/experts${query}`, {
    method: 'GET',
    authenticated: false,
    signal,
  })
  return response.map(mapExpertSummary)
}

async function detail(userId: string, signal?: AbortSignal): Promise<ExpertDetail> {
  const response = await apiClient.request<ExpertDetailDto>(`/experts/${encodeURIComponent(userId)}`, {
    method: 'GET',
    authenticated: false,
    signal,
  })
  return mapExpertDetail(response)
}

export const expertsApi = { list, detail }
