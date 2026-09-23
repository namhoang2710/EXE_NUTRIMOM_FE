import { apiClient } from '@/core/api/api-client'
import { getSession } from '@/core/auth/token-store'
import type { BirthPlan, CarePlan, CursorPage, Guidance, MedicalRecord, MomDashboard, PartnerDashboard, Pregnancy, PregnancyCalculation, PreparationItem, UploadedFile, UploadSession, WeekContent } from '@/types/domain'

export const pregnancyApi = {
  current: () => apiClient.request<Pregnancy>('/pregnancies/current'),
  calculate: (body: Record<string, unknown>) => apiClient.request<PregnancyCalculation>('/pregnancies/calculate', { method: 'POST', body: JSON.stringify(body) }),
  create: (body: Record<string, unknown>) => apiClient.request<Pregnancy>('/pregnancies', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) => apiClient.request<Pregnancy>(`/pregnancies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  weekContent: (week: number) => apiClient.request<WeekContent>(`/pregnancy-content/weeks/${week}`),
}

export const dashboardApi = {
  mom: () => apiClient.request<MomDashboard>('/dashboard/mom'),
  partner: () => apiClient.request<PartnerDashboard>('/dashboard/partner'),
}

export const careApi = {
  current: () => apiClient.request<CarePlan>('/care-plans/current'),
  guidance: () => apiClient.request<CursorPage<Guidance>>('/verified-guidance?limit=5'),
  items: () => apiClient.request<PreparationItem[]>('/preparation-items'),
  updateItem: (id: string, body: { completed: boolean; version: number }) => apiClient.request<PreparationItem>(`/preparation-items/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  birthPlan: () => apiClient.request<BirthPlan>('/birth-plans/current'),
  updateBirthPlan: (body: Partial<BirthPlan> & { version: number }) => apiClient.request<BirthPlan>('/birth-plans/current', { method: 'PUT', body: JSON.stringify(body) }),
}

export const recordsApi = {
  list: (query = '') => apiClient.request<CursorPage<MedicalRecord>>(`/medical-records${query}`),
  get: (id: string) => apiClient.request<MedicalRecord>(`/medical-records/${id}`),
  create: (body: Record<string, unknown>) => apiClient.request<MedicalRecord>('/medical-records', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) => apiClient.request<MedicalRecord>(`/medical-records/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) => apiClient.request<void>(`/medical-records/${id}`, { method: 'DELETE' }),
}

export const filesApi = {
  createSession: (body: Record<string, unknown>) => apiClient.request<UploadSession>('/files/upload-sessions', { method: 'POST', body: JSON.stringify(body) }),
  complete: (id: string, body: Record<string, unknown>) => apiClient.request<UploadedFile>(`/files/${id}/complete`, { method: 'POST', body: JSON.stringify(body) }),
  download: (id: string) => apiClient.request<{ download_url: string }>(`/files/${id}/download-url`),
}

export async function uploadContent(session: UploadSession, file: File) {
  const headers = new Headers(session.headers)
  const token = getSession()
  if (session.upload_url.startsWith('/') && token) headers.set('Authorization', `${token.tokenType} ${token.accessToken}`)
  const response = await fetch(session.upload_url, { method: 'PUT', headers, body: file })
  if (!response.ok) throw new Error('Không thể tải tệp lên máy chủ.')
}

export async function sha256(file: File) {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
