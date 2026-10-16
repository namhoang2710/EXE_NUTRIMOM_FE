import { getSessionScope } from '@/core/auth/token-store'
import { requireCurrentScope, profileRead, seedProfileResource, invalidateProfileResources } from '@/core/api/profile-requests'
import { apiClient } from '@/core/api/api-client'
import type {
  AdminContactDetailDto,
  AdminContactListQuery,
  AdminContactSummaryDto,
  ContactPageDto,
  ContactRequestDto,
  CreateContactRequestDto,
  UserContactListQuery,
} from '../model/contact-dto'
import { buildContactQueryString } from '../model/contact-query'
import { contactEndpoints } from '../model/contact-endpoints'

// Các mutation cố tình không nhận `AbortSignal`: hủy một POST đang bay sẽ để lại
// trạng thái server đã đổi nhưng UI thì không biết.
export const contactApi = {
  async create(body: CreateContactRequestDto) {
    const scope = getSessionScope()
    const created = await apiClient.request<ContactRequestDto>(contactEndpoints.requests, { method: 'POST', body: JSON.stringify(body) })
    requireCurrentScope(scope)
    invalidateProfileResources('support:list:')
    seedProfileResource(`support:detail:${created.id}`, created)
    return created
  },
  list(query: UserContactListQuery, signal?: AbortSignal) {
    return profileRead(`support:list:${buildContactQueryString(query)}`, () => apiClient.request<ContactPageDto<ContactRequestDto>>(`${contactEndpoints.requests}${buildContactQueryString(query)}`), signal)
  },
  get(id: string, signal?: AbortSignal) {
    return profileRead(`support:detail:${id}`, () => apiClient.request<ContactRequestDto>(contactEndpoints.request(id)), signal)
  },
  async cancel(id: string) {
    const scope = getSessionScope()
    const updated = await apiClient.request<ContactRequestDto>(contactEndpoints.cancel(id), { method: 'POST' })
    requireCurrentScope(scope)
    invalidateProfileResources('support:list:')
    seedProfileResource(`support:detail:${id}`, updated)
    return updated
  },
}

export const contactAdminApi = {
  list(query: AdminContactListQuery, signal?: AbortSignal) {
    return apiClient.request<ContactPageDto<AdminContactSummaryDto>>(`${contactEndpoints.adminRequests}${buildContactQueryString(query)}`, { signal })
  },
  get(id: string, signal?: AbortSignal) {
    return apiClient.request<AdminContactDetailDto>(contactEndpoints.adminRequest(id), { signal })
  },
  complete(id: string) {
    return apiClient.request<AdminContactDetailDto>(contactEndpoints.complete(id), { method: 'POST' })
  },
}
