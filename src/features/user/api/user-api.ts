import { apiClient } from '@/core/api/api-client'
import type { ProfilePatch, UserPreferences, UserProfile, PreferencesPatch } from '../model/user-types'

export const userApi = {
  profile: () => apiClient.request<UserProfile>('/users/me'),
  updateProfile: (body: ProfilePatch) => apiClient.request<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  preferences: () => apiClient.request<UserPreferences>('/users/me/preferences'),
  updatePreferences: (body: PreferencesPatch) => apiClient.request<UserPreferences>('/users/me/preferences', { method: 'PATCH', body: JSON.stringify(body) }),
  createPregnancy: (body: { estimated_due_date: string } | { last_menstrual_period: string }) => apiClient.request<unknown>('/pregnancies', { method: 'POST', body: JSON.stringify(body) }),
  disableAccount: (body: { reason: string; password: string } | { reason: string; otp_challenge_id: string; otp_code: string }) => apiClient.request<unknown>('/users/me', { method: 'DELETE', body: JSON.stringify(body) }),
}
