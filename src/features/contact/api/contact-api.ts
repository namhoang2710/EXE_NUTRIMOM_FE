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
import { adminRead, adminMutation } from '@/features/admin/api/admin-read'
import { mapAdminPage } from '@/features/admin/model/admin-workspace-contract'
import { uuidPattern } from '@/features/admin/model/admin-workspace-query'

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
    return adminRead(`${contactEndpoints.adminRequests}${buildContactQueryString(query)}`, (p) => mapAdminPage(p,(row) => row as AdminContactSummaryDto),signal)
  },
  get(id: string, signal?: AbortSignal) {
    if (!uuidPattern.test(id)) return Promise.reject(new Error('Mã yêu cầu hỗ trợ UUID không hợp lệ.'))
    return adminRead(contactEndpoints.adminRequest(id),(p) => p as AdminContactDetailDto,signal)
  },
  complete(id: string) {
    if (!uuidPattern.test(id)) return Promise.reject(new Error('Mã yêu cầu hỗ trợ UUID không hợp lệ.'))
    return adminMutation(() => apiClient.request<AdminContactDetailDto>(contactEndpoints.complete(id), { method: 'POST', retryAfterRefresh:false }),[contactEndpoints.adminRequests,'/admin/dashboard','/notifications/unread-count'])
  },
}
