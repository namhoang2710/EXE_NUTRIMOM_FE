import { apiClient } from '@/core/api/api-client'
import type { ExpertSummaryDto } from '../model/expert-dto'
import { mapExpertSummary } from '../model/expert-mappers'
import type { Expert, ExpertSpecialty } from '../model/expert-types'

async function list(specialty: ExpertSpecialty | null, signal?: AbortSignal): Promise<Expert[]> {
  const query = specialty ? `?specialty=${encodeURIComponent(specialty)}` : ''
  const response = await apiClient.request<ExpertSummaryDto[]>(`/experts${query}`, {
    method: 'GET',
    authenticated: false,
    signal,
  })
  return response.map(mapExpertSummary)
}

export const expertsApi = { list }
