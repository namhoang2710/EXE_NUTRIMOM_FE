import { apiClient } from '@/core/api/api-client'
import type { AssistantConversation, AssistantConversationDetail, AssistantPreferences, AssistantReply, AssistantSendRequest, AssistantStatus, AssistantUserOverview } from '../model/assistant-dto'

const base = '/assistant'
export const assistantApi = {
  status: (signal?: AbortSignal) => apiClient.request<AssistantStatus>(`${base}/status`, { signal }),
  overview: (signal?: AbortSignal) => apiClient.request<AssistantUserOverview>(`${base}/context`, { signal }),
  preferences: (signal?: AbortSignal) => apiClient.request<AssistantPreferences>(`${base}/preferences`, { signal }),
  updatePreferences: (body: AssistantPreferences, signal?: AbortSignal) => apiClient.request<AssistantPreferences>(`${base}/preferences`, { method: 'PATCH', body: JSON.stringify(body), signal }),
  list: (signal?: AbortSignal) => apiClient.request<AssistantConversation[]>(`${base}/conversations`, { signal }),
  create: (signal?: AbortSignal) => apiClient.request<AssistantConversation>(`${base}/conversations`, { method: 'POST', signal }),
  detail: (id: string, signal?: AbortSignal) => apiClient.request<AssistantConversationDetail>(`${base}/conversations/${encodeURIComponent(id)}`, { signal }),
  remove: (id: string, signal?: AbortSignal) => apiClient.request<void>(`${base}/conversations/${encodeURIComponent(id)}`, { method: 'DELETE', signal }),
  send: (id: string, body: AssistantSendRequest, signal?: AbortSignal) => apiClient.request<AssistantReply>(`${base}/conversations/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify(body), signal, timeoutMs: 55_000 }),
}
