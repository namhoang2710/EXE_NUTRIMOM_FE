import { apiClient } from '@/core/api/api-client'

export interface VideoRoomInfo {
  request_id: string
  user_name: string | null
  expert_name: string | null
  specialty: 'PSYCHOLOGY' | 'OBSTETRICS' | 'HEALTH'
  note: string | null
  expert: boolean
  consultation_status: string
  state: 'READY' | 'SCHEDULED' | 'UNSCHEDULED' | 'UNAVAILABLE' | 'ENDED'
  can_join: boolean
  configured: boolean
  opens_at: string | null
  closes_at: string | null
  server_time: string
}
export interface VideoCredentials {
  server_url: string
  participant_token: string
  encryption_key: string
  closes_at: string
}
const path = (id: string) => `/consultation-requests/${encodeURIComponent(id)}/video`
export const videoApi = {
  info: (id: string, signal?: AbortSignal) => apiClient.request<VideoRoomInfo>(path(id), { signal, cache: 'no-store' }),
  join: (id: string, signal?: AbortSignal) => apiClient.request<VideoCredentials>(`${path(id)}/join`, { method: 'POST', cache: 'no-store', signal }),
  complete: (id: string, signal?: AbortSignal) => apiClient.request(`${path(id)}/complete`, { method: 'POST', cache: 'no-store', signal }),
}
