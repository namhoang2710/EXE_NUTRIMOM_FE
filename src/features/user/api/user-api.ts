import { invalidateDashboards } from '../../../core/api/dashboard-cache.ts'
import { getSessionScope } from '../../../core/auth/token-store.ts'
import { profileRead, seedProfileResource, invalidateProfileResources, requireCurrentScope } from '../../../core/api/profile-requests.ts'
import { apiClient } from '../../../core/api/api-client.ts'
import type { ProfilePatch, UserPreferences, UserProfile, PreferencesPatch } from '../model/user-types'
import type { Pregnancy } from '../../../types/domain.ts'

export const userApi = {
  profile: () => profileRead('user:profile', () => apiClient.request<UserProfile>('/users/me')),
  updateProfile: async (body: ProfilePatch) => {
    const scope = getSessionScope()
    const latest = await apiClient.request<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(body) })
    requireCurrentScope(scope)
    invalidateDashboards()
    seedProfileResource('user:profile', latest)
    return latest
  },
  preferences: () => profileRead('user:preferences', () => apiClient.request<UserPreferences>('/users/me/preferences')),
  updatePreferences: async (body: PreferencesPatch) => {
    const scope = getSessionScope()
    const latest = await apiClient.request<UserPreferences>('/users/me/preferences', { method: 'PATCH', body: JSON.stringify(body) })
    requireCurrentScope(scope)
    seedProfileResource('user:preferences', latest)
    return latest
  },
  createPregnancy: async (body: { estimated_due_date: string } | { last_menstrual_period: string }) => {
    const scope = getSessionScope()
    const result = await apiClient.request<Pregnancy>('/pregnancies', { method: 'POST', body: JSON.stringify(body) })
    requireCurrentScope(scope)
    invalidateDashboards()
    invalidateProfileResources('pregnancy:')
    invalidateProfileResources('care:')
    invalidateProfileResources('user:profile')
    seedProfileResource('pregnancy:current', result)
    return result
  },
  disableAccount: (body: { reason: string; password: string } | { reason: string; otp_challenge_id: string; otp_code: string }) => apiClient.request<unknown>('/users/me', { method: 'DELETE', body: JSON.stringify(body) }),
}
