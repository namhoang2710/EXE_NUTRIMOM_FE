import type { MedicalRecord } from '../../../types/domain.ts'

export type RecordAttachment = NonNullable<MedicalRecord['attachments']>[number]
export const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function resolveRecordAttachments(input: {
  recordId: string
  count: number
  opened: boolean
  provided?: RecordAttachment[]
}, getDetail: (id: string) => Promise<MedicalRecord>) {
  if (!input.opened || input.count === 0) return []
  if (input.provided && input.provided.length >= input.count) return input.provided
  const detail = await getDetail(input.recordId)
  if (!detail.attachments || detail.attachments.length < detail.attachment_count) throw new Error('Danh sách tệp đính kèm chưa đầy đủ. Hãy thử lại.')
  return detail.attachments
}

export function previewableAttachments(files: RecordAttachment[]) {
  return files.filter((file) => imageTypes.has(file.mime_type) && file.status === 'READY')
}
