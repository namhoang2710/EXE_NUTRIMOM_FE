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
  create(body: CreateContactRequestDto) {
    return apiClient.request<ContactRequestDto>(contactEndpoints.requests, { method: 'POST', body: JSON.stringify(body) })
  },
  list(query: UserContactListQuery, signal?: AbortSignal) {
    return apiClient.request<ContactPageDto<ContactRequestDto>>(`${contactEndpoints.requests}${buildContactQueryString(query)}`, { signal })
  },
  get(id: string, signal?: AbortSignal) {
    return apiClient.request<ContactRequestDto>(contactEndpoints.request(id), { signal })
  },
  cancel(id: string) {
    return apiClient.request<ContactRequestDto>(contactEndpoints.cancel(id), { method: 'POST' })
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
