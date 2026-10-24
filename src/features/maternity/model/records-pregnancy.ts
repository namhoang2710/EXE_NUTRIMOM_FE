import type { MedicalRecord, Pregnancy } from '../../../types/domain.ts'

const vietnamDate = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' })
const vietnamParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })

export function vietnamDateOnly(value: string | Date = new Date()) {
  const parts = vietnamParts.formatToParts(typeof value === 'string' ? new Date(value) : value)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function formatMedicalRecordDate(value: string) {
  return vietnamDate.format(new Date(value))
}

export function pregnancyLabel(pregnancy?: Pregnancy, id = pregnancy?.id ?? '') {
  if (!pregnancy) return `Thai kỳ ${id.slice(0, 8)}`
  const title = pregnancy.status === 'ACTIVE' ? 'Thai kỳ hiện tại' : 'Thai kỳ trước'
  return pregnancy.estimated_due_date ? `${title} · Dự sinh ${vietnamDate.format(new Date(`${pregnancy.estimated_due_date}T12:00:00+07:00`))}` : `${title} · ${id.slice(0, 8)}`
}

export const pregnancyStatusLabels: Record<Pregnancy['status'], string> = {
  ACTIVE: 'Đang theo dõi', COMPLETED: 'Đã hoàn tất', LOSS_REPORTED: 'Đã kết thúc', ARCHIVED: 'Đã lưu trữ',
}

export function groupMedicalRecords(records: MedicalRecord[], pregnancies: Pregnancy[]) {
  const lookup = new Map(pregnancies.map((pregnancy) => [pregnancy.id, pregnancy]))
  const groups = new Map<string, { id: string; pregnancy?: Pregnancy; records: MedicalRecord[] }>()
  for (const record of records) {
    let group = groups.get(record.pregnancy_id)
    if (!group) { group = { id: record.pregnancy_id, pregnancy: lookup.get(record.pregnancy_id), records: [] }; groups.set(group.id, group) }
    group.records.push(record)
  }
  return [...groups.values()].sort((a, b) => {
    const ongoing = Number(b.pregnancy?.status === 'ACTIVE') - Number(a.pregnancy?.status === 'ACTIVE')
    return ongoing || (b.pregnancy?.created_at ?? '').localeCompare(a.pregnancy?.created_at ?? '') || b.id.localeCompare(a.id)
  })
}
