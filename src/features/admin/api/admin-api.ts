import { apiClient } from '@/core/api/api-client'
import { adminMutation, adminRead } from './admin-read'
import { buildAdminConsultationsQueryString } from '../model/admin-consultations'
import type { AdminConsultationsQuery } from '../model/admin-consultations'
import { mapAdminConsultationsPage } from '../model/admin-consultations-mappers'
import type { AdminConsultationPageDto } from '../model/admin-consultations-mappers'
import { buildAdminUsersQueryString } from '../model/admin-users'
import type { AdminUsersQuery } from '../model/admin-users'
import { mapAdminUserDetail, mapAdminUsersPage, mapAdminUsersSummary } from '../model/admin-users-mappers'
import type { AdminUserDetailDto, AdminUsersPageDto, AdminUsersSummaryDto } from '../model/admin-users-mappers'
import { mapAdminExpert, mapExpertSpecialty, serializeCreateAdminExpert, serializeUpdateAdminExpert } from '../model/admin-experts-mappers'
import type { AdminExpertDto, ExpertSpecialtyDto } from '../model/admin-experts-mappers'
import type { CreateAdminExpertInput, UpdateAdminExpertInput } from '../model/admin-experts'
import { mapAdminPage, object, AdminContractError } from '../model/admin-workspace-contract'
import { expertSpecialties, expertStatuses } from '../model/admin-experts'
import { uuidPattern } from '../model/admin-workspace-query'

export const adminApi = {
  getAdminUsers: (params: AdminUsersQuery, signal?: AbortSignal) => adminRead(`/admin/users${buildAdminUsersQueryString(params)}`, (p) => mapAdminUsersPage(p as AdminUsersPageDto), signal),
  getAdminUserDetail: (userId: string, signal?: AbortSignal) => adminRead(`/admin/users/${encodeURIComponent(userId)}`, (p) => mapAdminUserDetail(p as AdminUserDetailDto), signal),
  getAdminUsersSummary: (signal?: AbortSignal) => adminRead('/admin/users/summary', (p) => mapAdminUsersSummary(p as AdminUsersSummaryDto), signal),
  getConsultations: (params: AdminConsultationsQuery, signal?: AbortSignal) => adminRead(`/admin/consultation-requests${buildAdminConsultationsQueryString(params)}`, (p) => mapAdminConsultationsPage(p as AdminConsultationPageDto), signal),
}
export function mapExpertPayload(payload: unknown) {
  const p = object(payload, 'expert')
  if (!expertSpecialties.includes(p.specialty as typeof expertSpecialties[number]) || !expertStatuses.includes(p.status as typeof expertStatuses[number]) || !Number.isSafeInteger(p.version) || (p.version as number) < 0 || typeof p.full_name !== 'string' || typeof p.user_id !== 'string' || !uuidPattern.test(p.user_id) || typeof p.average_rating !== 'number' || !Number.isFinite(p.average_rating) || p.average_rating < 0 || p.average_rating > 5 || !Number.isSafeInteger(p.rating_count) || (p.rating_count as number) < 0) throw new AdminContractError('expert')
  return mapAdminExpert(p as unknown as AdminExpertDto)
}
export const mapExpertsPage = (p: unknown) => mapAdminPage(p, mapExpertPayload)
export const mapSpecialties = (p: unknown) => {
  if (!Array.isArray(p) || p.some((row) => !row || !expertSpecialties.includes(row.code) || typeof row.display_name !== 'string' || !Number.isSafeInteger(row.sort_order))) throw new AdminContractError('specialties')
  return (p as ExpertSpecialtyDto[]).map(mapExpertSpecialty).sort((a, b) => a.sortOrder - b.sortOrder)
}
const expertInvalidations = ['/admin/experts', '/admin/dashboard']
export const adminExpertsApi = {
  list: (signal?: AbortSignal) => adminRead('/admin/experts', (p) => (p as AdminExpertDto[]).map(mapExpertPayload), signal),
  detail: (userId: string, signal?: AbortSignal) => adminRead(`/admin/experts/${encodeURIComponent(userId)}`, mapExpertPayload, signal),
  create: (input: CreateAdminExpertInput) => adminMutation(async () => mapExpertPayload(await apiClient.request('/admin/experts', { method: 'POST', body: JSON.stringify(serializeCreateAdminExpert(input)), retryAfterRefresh: false })), expertInvalidations),
  update: (userId: string, input: UpdateAdminExpertInput) => adminMutation(async () => mapExpertPayload(await apiClient.request(`/admin/experts/${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify(serializeUpdateAdminExpert(input)), retryAfterRefresh: false })), expertInvalidations),
  deactivate: (userId: string) => adminMutation(() => apiClient.request<void>(`/admin/experts/${encodeURIComponent(userId)}`, { method: 'DELETE', retryAfterRefresh: false }), expertInvalidations),
  uploadAvatar: (userId: string, file: File) => adminMutation(async () => {
    const body = new FormData(); body.append('file', file)
    return mapExpertPayload(await apiClient.request(`/admin/experts/${encodeURIComponent(userId)}/avatar`, { method: 'POST', body, timeoutMs: 60_000, retryAfterRefresh: false }))
  }, expertInvalidations),
  specialties: (signal?: AbortSignal) => adminRead('/reference-data/specialties', mapSpecialties, signal, 300_000),
}
