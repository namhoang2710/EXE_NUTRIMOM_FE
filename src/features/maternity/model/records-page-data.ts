import type { CursorPage, MedicalRecord, Pregnancy } from '../../../types/domain'

export const medicalRecordCategoryLabels: Record<string, string> = {
  PRENATAL_VISIT: 'Khám thai', ULTRASOUND: 'Siêu âm', LAB_RESULT: 'Kết quả xét nghiệm',
  PRESCRIPTION: 'Đơn thuốc', DISCHARGE: 'Giấy ra viện', OTHER: 'Khác',
}

export interface MedicalRecordFilters {
  pregnancyId?: string
  category: string
  from: string
  to: string
}

export function isNoCurrentPregnancyError(reason: unknown) {
  if (!(reason instanceof Error)) return false
  const { code } = reason as Error & { code?: unknown }
  return code === 'RESOURCE_NOT_FOUND' || code === 'ACTIVE_PREGNANCY_NOT_FOUND'
}

export async function loadCurrentPregnancy(getCurrentPregnancy: () => Promise<Pregnancy>) {
  try {
    return await getCurrentPregnancy()
  } catch (reason) {
    if (isNoCurrentPregnancyError(reason)) return null
    throw reason
  }
}

export function createCurrentPregnancyLoader(getCurrentPregnancy: () => Promise<Pregnancy>) {
  let request: Promise<Pregnancy | null> | null = null
  return () => {
    request ??= loadCurrentPregnancy(getCurrentPregnancy).finally(() => { request = null })
    return request
  }
}

export function buildMedicalRecordsQuery(filters: MedicalRecordFilters, cursor?: string) {
  const params = new URLSearchParams({ limit: '12' })
  if (filters.pregnancyId) params.set('pregnancy_id', filters.pregnancyId)
  if (filters.category) params.set('category', filters.category)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (cursor) params.set('cursor', cursor)
  return `?${params.toString()}`
}

export function loadMedicalRecords(
  listRecords: (query: string) => Promise<CursorPage<MedicalRecord>>,
  filters: MedicalRecordFilters,
  cursor?: string,
) {
  return listRecords(buildMedicalRecordsQuery(filters, cursor))
}

export function vietnamDateAtStartOfDayUtc(date: string) {
  const localMidnight = new Date(`${date}T00:00:00+07:00`)
  if (Number.isNaN(localMidnight.getTime())) throw new Error('Ngày khám không hợp lệ.')
  return localMidnight.toISOString()
}

export function buildMedicalRecordPayload(input: {
  category: string
  title: string
  occurredAt: string
  facilityName: string
  clinicianName: string
  summary: string
  note: string
  attachmentIds: string[]
}) {
  return {
    category: input.category,
    title: input.title,
    occurred_at: vietnamDateAtStartOfDayUtc(input.occurredAt),
    facility_name: input.facilityName,
    clinician_name: input.clinicianName,
    summary: input.summary,
    note: input.note,
    attachment_ids: input.attachmentIds,
  }
}
