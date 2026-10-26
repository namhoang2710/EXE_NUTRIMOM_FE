import { dashboardCache, invalidateDashboards } from '../../../core/api/dashboard-cache.ts'
import { apiClient } from '../../../core/api/api-client.ts'
import { createSingleFlight } from '../../../core/api/single-flight.ts'
import { getSessionScope } from '../../../core/auth/token-store.ts'
import { profileRead, seedProfileResource, invalidateProfileResources, requireCurrentScope } from '../../../core/api/profile-requests.ts'
import { forConsumer } from '../../../core/api/resource-cache.ts'
import { createConcurrencyPool } from '../../../core/api/concurrency-pool.ts'
import { ApiClientError } from '../../../core/api/api-error.ts'
import type { ActivePregnancy, BirthPlan, CarePlan, CursorPage, Guidance, MedicalRecord, MomDashboard, PartnerDashboard, Pregnancy, PregnancyStatus, PregnancyCalculation, PreparationItem, UploadedFile, UploadSession } from '@/types/domain'

const pregnancyReads = { run: profileRead }
const binaryReads = createSingleFlight()
const previewPool = createConcurrencyPool(3)
if (typeof window !== 'undefined') {
  window.addEventListener('nutrimom:session-cleared', () => binaryReads.clear())
  window.addEventListener('nutrimom:session-changed', () => binaryReads.clear())
}

function pregnancyReadKey(resource: string) {
  return `pregnancy:${resource}`
}

export const pregnancyApi = {
  current: () => pregnancyReads.run(pregnancyReadKey('current'), () => apiClient.request<ActivePregnancy>('/pregnancies/current')),
  list: (status?: PregnancyStatus, signal?: AbortSignal) => profileRead(pregnancyReadKey(`list:${status ?? ''}`), () => apiClient.request<Pregnancy[]>(`/pregnancies${status ? `?status=${encodeURIComponent(status)}` : ''}`), signal),
  calculate: (body: Record<string, unknown>) => apiClient.request<PregnancyCalculation>('/pregnancies/calculate', { method: 'POST', body: JSON.stringify(body) }),
  create: async (body: Record<string, unknown>) => {
    const scope = getSessionScope()
    const created = await apiClient.request<ActivePregnancy>('/pregnancies', { method: 'POST', body: JSON.stringify(body) })
    requireCurrentScope(scope)
    invalidateDashboards()
    invalidateProfileResources('pregnancy:')
    invalidateProfileResources('care:')
    invalidateProfileResources('user:profile')
    seedProfileResource('pregnancy:current', created)
    return created
  },
  update: async (id: string, body: Record<string, unknown>) => {
    const scope = getSessionScope()
    const updated = await apiClient.request<Pregnancy>(`/pregnancies/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    requireCurrentScope(scope)
    invalidateDashboards()
    invalidateProfileResources('pregnancy:')
    invalidateProfileResources('care:')
    if (updated.status === 'ACTIVE') seedProfileResource('pregnancy:current', updated)
    return updated
  },
}

export const dashboardApi = {
  mom: (signal?: AbortSignal) => forConsumer(dashboardCache.read('mom', () => apiClient.request<MomDashboard>('/dashboard/mom')), signal),
  partner: (signal?: AbortSignal) => forConsumer(dashboardCache.read('partner', () => apiClient.request<PartnerDashboard>('/dashboard/partner')), signal),
}

export const careApi = {
  current: () => profileRead('care:current', () => apiClient.request<CarePlan>('/care-plans/current')),
  guidance: () => profileRead('care:guidance', () => apiClient.request<CursorPage<Guidance>>('/verified-guidance?limit=5')),
  items: () => profileRead('care:items', () => apiClient.request<PreparationItem[]>('/preparation-items')),
  updateItem: async (id: string, body: { completed: boolean; version: number }) => {
    const scope = getSessionScope()
    const updated = await apiClient.request<PreparationItem>(`/preparation-items/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    requireCurrentScope(scope)
    invalidateProfileResources('care:items')
    return updated
  },
  birthPlan: () => profileRead('care:birth-plan', () => apiClient.request<BirthPlan>('/birth-plans/current')),
  updateBirthPlan: async (body: Partial<BirthPlan> & { version: number }) => {
    const scope = getSessionScope()
    const updated = await apiClient.request<BirthPlan>('/birth-plans/current', { method: 'PUT', body: JSON.stringify(body) })
    requireCurrentScope(scope)
    seedProfileResource('care:birth-plan', updated)
    return updated
  },
}

function acceptRecord(record: MedicalRecord) {
  invalidateProfileResources('calendar:')
  invalidateProfileResources(`records:list:${record.pregnancy_id}:`)
  invalidateProfileResources('records:list::')
  seedProfileResource(`records:detail:${record.id}`, record)
  return record
}

export const recordsApi = {
  list: (query = '', signal?: AbortSignal) => {
    const params = new URLSearchParams(query)
    params.sort()
    return profileRead(`records:list:${params.get('pregnancy_id') ?? ''}:${params}`, () => apiClient.request<CursorPage<MedicalRecord>>(`/medical-records${query}`), signal)
  },
  get: (id: string, signal?: AbortSignal) => profileRead(`records:detail:${id}`, () => apiClient.request<MedicalRecord>(`/medical-records/${encodeURIComponent(id)}`), signal),
  create: async (body: Record<string, unknown>) => {
    const scope = getSessionScope()
    const record = await apiClient.request<MedicalRecord>('/medical-records', { method: 'POST', body: JSON.stringify(body) })
    requireCurrentScope(scope)
    return acceptRecord(record)
  },
  update: async (id: string, body: Record<string, unknown>) => {
    const scope = getSessionScope()
    const record = await apiClient.request<MedicalRecord>(`/medical-records/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    requireCurrentScope(scope)
    return acceptRecord(record)
  },
  remove: async (id: string, pregnancyId?: string) => {
    const scope = getSessionScope()
    await apiClient.request<void>(`/medical-records/${id}`, { method: 'DELETE' })
    requireCurrentScope(scope)
    invalidateProfileResources(pregnancyId ? `records:list:${pregnancyId}:` : 'records:list:')
    invalidateProfileResources('records:list::')
    invalidateProfileResources(`records:detail:${id}`)
    invalidateProfileResources('calendar:')
  },
}

interface UploadMetadata {
  purpose: 'MEDICAL_RECORD'
  file_name: string
  mime_type: string
  size_bytes: number
  sha256: string
  pregnancy_id?: string
}

async function downloadBlob(id: string, signal?: AbortSignal) {
  const scope = getSessionScope()
  return forConsumer(binaryReads.run(`${scope}:file:${id}`, async () => {
    requireCurrentScope(scope)
    // Share link AND bytes. Issuing a second link can revoke the first BE token.
    for (let attempt = 0; ; attempt += 1) {
      const { download_url } = await filesApi.download(id)
      requireCurrentScope(scope)
      try {
        const blob = await apiClient.binary(download_url)
        requireCurrentScope(scope)
        return blob
      } catch (reason) {
        if (attempt === 0 && reason instanceof ApiClientError && [401, 403].includes(reason.status)) continue
        throw reason
      }
    }
  }), signal)
}

export const filesApi = {
  createSession: (body: UploadMetadata, signal?: AbortSignal) => apiClient.request<UploadSession>('/files/upload-sessions', { method: 'POST', body: JSON.stringify(body), signal }),
  complete: (id: string, body: { sha256: string; size_bytes: number }, signal?: AbortSignal) => apiClient.request<UploadedFile>(`/files/${id}/complete`, { method: 'POST', body: JSON.stringify(body), signal }),
  download: (id: string) => {
    const scope = getSessionScope()
    return binaryReads.run(`${scope}:link:${id}`, () => {
      requireCurrentScope(scope)
      return apiClient.request<{ download_url: string }>(`/files/${id}/download-url`)
    })
  },
  downloadBlob,
  previewImage: async (id: string, signal?: AbortSignal) => {
    const scope = getSessionScope()
    const blob = await forConsumer(binaryReads.run(`${scope}:preview:${id}`, () => previewPool(async () => {
      requireCurrentScope(scope)
      return downloadBlob(id)
    })), signal)
    requireCurrentScope(scope)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) throw new Error('Tệp không phải ảnh được hỗ trợ.')
    return URL.createObjectURL(blob)
  },
  saveDownload: async (id: string, name = 'tai-lieu') => {
    const blob = await downloadBlob(id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = name; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}

export async function uploadContent(session: UploadSession, file: File, signal?: AbortSignal) {
  await apiClient.upload(session.upload_url, { method: 'PUT', headers: session.headers, body: file, signal, timeoutMs: 60_000 })
}

export async function sha256(file: File) {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
