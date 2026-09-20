import { apiRequest } from './api'
import { getSession } from './token-store'
import type { ApiPreferences, ApiProfile, BirthPlan, CarePlan, CursorPage, Guidance, MedicalRecord, MomDashboard, PartnerDashboard, Pregnancy, PregnancyCalculation, PreparationItem, UploadedFile, UploadSession, WeekContent } from '../types/domain'

export const userApi = {
  profile: () => apiRequest<ApiProfile>('/users/me'),
  updateProfile: (body: Partial<ApiProfile> & { version: number }) => apiRequest<ApiProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  preferences: () => apiRequest<ApiPreferences>('/users/me/preferences'),
  updatePreferences: (body: Partial<ApiPreferences> & { version: number }) => apiRequest<ApiPreferences>('/users/me/preferences', { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAccount: (body: { reason: string; password?: string }) => apiRequest<{ deletion_request_id: string }>('/users/me', { method: 'DELETE', body: JSON.stringify(body) }),
}

export const pregnancyApi = {
  current: () => apiRequest<Pregnancy>('/pregnancies/current'),
  calculate: (body: Record<string, unknown>) => apiRequest<PregnancyCalculation>('/pregnancies/calculate', { method: 'POST', body: JSON.stringify(body) }),
  create: (body: Record<string, unknown>) => apiRequest<Pregnancy>('/pregnancies', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) => apiRequest<Pregnancy>(`/pregnancies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  weekContent: (week: number) => apiRequest<WeekContent>(`/pregnancy-content/weeks/${week}`),
}

export const dashboardApi = {
  mom: () => apiRequest<MomDashboard>('/dashboard/mom'),
  partner: () => apiRequest<PartnerDashboard>('/dashboard/partner'),
}

export const careApi = {
  current: () => apiRequest<CarePlan>('/care-plans/current'),
  guidance: () => apiRequest<CursorPage<Guidance>>('/verified-guidance?limit=5'),
  items: () => apiRequest<PreparationItem[]>('/preparation-items'),
  updateItem: (id: string, body: { completed: boolean; version: number }) => apiRequest<PreparationItem>(`/preparation-items/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  birthPlan: () => apiRequest<BirthPlan>('/birth-plans/current'),
  updateBirthPlan: (body: Partial<BirthPlan> & { version: number }) => apiRequest<BirthPlan>('/birth-plans/current', { method: 'PUT', body: JSON.stringify(body) }),
}

export const recordsApi = {
  list: (query = '') => apiRequest<CursorPage<MedicalRecord>>(`/medical-records${query}`),
  create: (body: Record<string, unknown>) => apiRequest<MedicalRecord>('/medical-records', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) => apiRequest<MedicalRecord>(`/medical-records/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) => apiRequest<void>(`/medical-records/${id}`, { method: 'DELETE' }),
}

export const filesApi = {
  createSession: (body: Record<string, unknown>) => apiRequest<UploadSession>('/files/upload-sessions', { method: 'POST', body: JSON.stringify(body) }),
  complete: (id: string, body: Record<string, unknown>) => apiRequest<UploadedFile>(`/files/${id}/complete`, { method: 'POST', body: JSON.stringify(body) }),
  download: (id: string) => apiRequest<{ download_url: string }>(`/files/${id}/download-url`),
}

export async function uploadContent(session: UploadSession, file: File) {
  const headers = new Headers(session.headers)
  const token = getSession()
  if (session.upload_url.startsWith('/') && token) headers.set('Authorization', `${token.tokenType} ${token.accessToken}`)
  const url = session.upload_url.startsWith('/') ? session.upload_url : session.upload_url
  const response = await fetch(url, { method: 'PUT', headers, body: file })
  if (!response.ok) throw new Error('Không thể tải tệp lên máy chủ.')
}

export async function sha256(file: File) {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
