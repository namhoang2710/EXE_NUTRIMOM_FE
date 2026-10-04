import { apiClient } from '@/core/api/api-client'
import type {
  ActivityPage,
  CreateInvitationInput,
  CreateTaskInput,
  FamilyGroup,
  FamilyInvitation,
  FamilyMember,
  FamilyScope,
  FamilyTask,
  FamilyTaskStatus,
  UpdateTaskInput,
} from '../model/family-types'
import { buildActivityPath, buildTasksPath, invitationBody } from '../model/family-requests'

export const familyApi = {
  groups: (signal?: AbortSignal) => apiClient.request<FamilyGroup[]>('/family-groups', { signal }),
  createGroup: (pregnancyId?: string) => apiClient.request<FamilyGroup>('/family-groups', {
    method: 'POST',
    body: JSON.stringify(pregnancyId ? { pregnancy_id: pregnancyId } : {}),
  }),
  createInvitation: (input: CreateInvitationInput) => apiClient.request<FamilyInvitation>('/family-invitations', {
    method: 'POST',
    body: JSON.stringify(invitationBody(input)),
  }),
  acceptInvitation: (token: string) => apiClient.request<FamilyMember>('/family-invitations/accept', {
    method: 'POST',
    body: JSON.stringify({ token: token.trim() }),
  }),
  members: (signal?: AbortSignal) => apiClient.request<FamilyMember[]>('/family-members', { signal }),
  updateMember: (memberId: string, scopes: FamilyScope[], version: number) => apiClient.request<FamilyMember>(`/family-members/${encodeURIComponent(memberId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ scopes, version }),
  }),
  revokeMember: (memberId: string) => apiClient.request<void>(`/family-members/${encodeURIComponent(memberId)}`, { method: 'DELETE' }),
  tasks: (filters: { assignee_id?: string; status?: FamilyTaskStatus }, signal?: AbortSignal) => apiClient.request<FamilyTask[]>(buildTasksPath(filters), { signal }),
  createTask: (body: CreateTaskInput) => apiClient.request<FamilyTask>('/family/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (taskId: string, body: UpdateTaskInput) => apiClient.request<FamilyTask>(`/family/tasks/${encodeURIComponent(taskId)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTask: (taskId: string) => apiClient.request<void>(`/family/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' }),
  activity: (cursor?: string, signal?: AbortSignal) => apiClient.request<ActivityPage>(buildActivityPath(cursor), { signal }),
}
