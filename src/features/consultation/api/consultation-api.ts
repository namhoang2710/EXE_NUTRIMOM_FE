import { getSessionScope } from '@/core/auth/token-store'
import { requireCurrentScope, profileRead, invalidateProfileResources, seedProfileResource } from '@/core/api/profile-requests'
import { createExpertReadCoordinator } from '@/features/expert-console/model/expert-read-coordinator'
import { apiClient, type ApiRequestOptions } from '@/core/api/api-client'
import type { ConsultationPageDto, ConsultationRequestDto, ConsultationReviewDto, ConsultationExpertDto, DayAvailabilityDto } from '../model/consultation-dto'
import { mapConsultationExpert, mapConsultationPage, mapConsultationRequest, mapDayAvailability, serializeConsultationReview, serializeDirectConsultation, serializeRandomConsultation } from '../model/consultation-mappers'
import { buildAvailabilityQuery, buildConsultationListQuery } from '../model/consultation-query'
import type { ConsultationReviewInput, DirectConsultationInput, RandomConsultationInput } from '../model/consultation-types'

// One cooldown for this API family; user actions never retry a 429 automatically.
const requests=createExpertReadCoordinator()
async function request<T>(path:string,options:ApiRequestOptions={}){
  const scope=getSessionScope();requests.setScope(scope);requests.assertAvailable()
  try{const value=await apiClient.request<T>(path,options);requireCurrentScope(scope);return value}
  catch(error){if(scope===getSessionScope())requests.recordFailure(error);throw error}
}
if(typeof window!=='undefined')for(const event of ['nutrimom:session-cleared','nutrimom:session-changed'])window.addEventListener(event,()=>requests.clear())

export const consultationApi = {
  async expert(userId: string, signal?: AbortSignal) {
    requests.setScope(getSessionScope())
    const dto = await requests.run(`expert:${userId}`,()=>request<ConsultationExpertDto>(`/experts/${encodeURIComponent(userId)}`),signal,60_000)
    return mapConsultationExpert(dto)
  },
  async availability(userId: string, date: string, signal?: AbortSignal) {
    requests.setScope(getSessionScope())
    const dto = await requests.run(`slots:${userId}:${date}`,()=>request<DayAvailabilityDto>(`/experts/${encodeURIComponent(userId)}/availability${buildAvailabilityQuery(date)}`),signal)
    return mapDayAvailability(dto)
  },
  async createDirect(input: DirectConsultationInput) {
    const scope = getSessionScope()
    const dto = await request<ConsultationRequestDto>('/consultation-requests', {
      method: 'POST', body: JSON.stringify(serializeDirectConsultation(input)),
    })
    requireCurrentScope(scope)
    invalidateProfileResources('consultation:list:')
    return mapConsultationRequest(dto)
  },
  async createRandom(input: RandomConsultationInput) {
    const scope = getSessionScope()
    const dto = await request<ConsultationRequestDto>('/consultation-requests', {
      method: 'POST', body: JSON.stringify(serializeRandomConsultation(input)),
    })
    requireCurrentScope(scope)
    invalidateProfileResources('consultation:list:')
    return mapConsultationRequest(dto)
  },
  async list(page: number, pageSize: number, signal?: AbortSignal) {
    const dto = await profileRead(`consultation:list:${page}:${pageSize}`, () => request<ConsultationPageDto>(`/consultation-requests${buildConsultationListQuery(page, pageSize)}`), signal)
    return mapConsultationPage(dto)
  },
  async get(id: string, signal?: AbortSignal) {
    const dto = await profileRead(`consultation:detail:${id}`, () => request<ConsultationRequestDto>(`/consultation-requests/${encodeURIComponent(id)}`), signal)
    return mapConsultationRequest(dto)
  },
  async cancel(id: string) {
    const scope = getSessionScope()
    const dto = await request<ConsultationRequestDto>(`/consultation-requests/${encodeURIComponent(id)}/cancel`, { method: 'POST' })
    requireCurrentScope(scope)
    invalidateProfileResources('consultation:list:')
    seedProfileResource(`consultation:detail:${id}`, dto)
    return mapConsultationRequest(dto)
  },
  async review(id: string, input: ConsultationReviewInput) {
    const scope = getSessionScope()
    const result = await request<ConsultationReviewDto>(`/consultation-requests/${encodeURIComponent(id)}/review`, {
      method: 'POST', body: JSON.stringify(serializeConsultationReview(input)),
    })
    requireCurrentScope(scope)
    invalidateProfileResources('consultation:list:')
    invalidateProfileResources(`consultation:detail:${id}`)
    return result
  },
}
