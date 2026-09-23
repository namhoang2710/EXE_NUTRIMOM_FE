import { apiClient } from '@/core/api/api-client'
import {
  adminAppointments,
  adminConsultations,
  adminDashboardData,
  adminHealthAlerts,
  adminNutritionPlans,
  adminReports,
} from '../mock/admin-data'
import { buildAdminUsersQueryString } from '../model/admin-users'
import type {
  AdminUsersQuery,
} from '../model/admin-users'
import {
  mapAdminUserDetail,
  mapAdminUsersPage,
  mapAdminUsersSummary,
} from '../model/admin-users-mappers'
import type {
  AdminUserDetailDto,
  AdminUsersPageDto,
  AdminUsersSummaryDto,
} from '../model/admin-users-mappers'
import { mapAdminExpert, mapExpertSpecialty, serializeCreateAdminExpert, serializeUpdateAdminExpert } from '../model/admin-experts-mappers'
import type { AdminExpertDto, ExpertSpecialtyDto } from '../model/admin-experts-mappers'
import type { CreateAdminExpertInput, UpdateAdminExpertInput } from '../model/admin-experts'

function fromMock<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 320)
  })
}

// Keep the API boundary stable: replace these mock-backed methods with apiClient
// requests when the corresponding admin endpoints become available.
export const adminApi = {
  getDashboard: () => fromMock(adminDashboardData),
  async getAdminUsers(params: AdminUsersQuery, signal?: AbortSignal) {
    const response = await apiClient.request<AdminUsersPageDto>(`/admin/users${buildAdminUsersQueryString(params)}`, { signal })
    return mapAdminUsersPage(response)
  },
  async getAdminUserDetail(userId: string, signal?: AbortSignal) {
    const response = await apiClient.request<AdminUserDetailDto>(`/admin/users/${encodeURIComponent(userId)}`, { signal })
    return mapAdminUserDetail(response)
  },
  async getAdminUsersSummary(signal?: AbortSignal) {
    const response = await apiClient.request<AdminUsersSummaryDto>('/admin/users/summary', { signal })
    return mapAdminUsersSummary(response)
  },
  getAppointments: () => fromMock(adminAppointments),
  getConsultations: () => fromMock(adminConsultations),
  getReports: () => fromMock(adminReports),
  getHealthAlerts: () => fromMock(adminHealthAlerts),
  getNutritionPlans: () => fromMock(adminNutritionPlans),
}

export const adminExpertsApi = {
  async list(signal?: AbortSignal) {
    const response = await apiClient.request<AdminExpertDto[]>('/admin/experts', { signal })
    return response.map(mapAdminExpert)
  },
  async detail(userId: string, signal?: AbortSignal) {
    const response = await apiClient.request<AdminExpertDto>(`/admin/experts/${encodeURIComponent(userId)}`, { signal })
    return mapAdminExpert(response)
  },
  async create(input: CreateAdminExpertInput) {
    const response = await apiClient.request<AdminExpertDto>('/admin/experts', {
      method: 'POST',
      body: JSON.stringify(serializeCreateAdminExpert(input)),
    })
    return mapAdminExpert(response)
  },
  async update(userId: string, input: UpdateAdminExpertInput) {
    const response = await apiClient.request<AdminExpertDto>(`/admin/experts/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(serializeUpdateAdminExpert(input)),
    })
    return mapAdminExpert(response)
  },
  async deactivate(userId: string) {
    await apiClient.request<void>(`/admin/experts/${encodeURIComponent(userId)}`, { method: 'DELETE' })
  },
  async uploadAvatar(userId: string, file: File) {
    const body = new FormData()
    body.append('file', file)
    const response = await apiClient.request<AdminExpertDto>(`/admin/experts/${encodeURIComponent(userId)}/avatar`, {
      method: 'POST',
      body,
      timeoutMs: 60_000,
    })
    return mapAdminExpert(response)
  },
  async specialties(signal?: AbortSignal) {
    const response = await apiClient.request<ExpertSpecialtyDto[]>('/reference-data/specialties', { signal })
    return response.map(mapExpertSpecialty).sort((left, right) => left.sortOrder - right.sortOrder)
  },
}
