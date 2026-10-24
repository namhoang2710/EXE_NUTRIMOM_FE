import { CalendarPlus, CaretDown, FileText, PencilSimple, Trash } from '@phosphor-icons/react'
import { MedicalRecordAttachments } from './MedicalRecordAttachments'
import { medicalRecordCategoryLabels } from '../model/records-page-data'
import { formatMedicalRecordDate, groupMedicalRecords, pregnancyLabel, pregnancyStatusLabels } from '../model/records-pregnancy'
import type { MedicalRecord } from '@/types/domain'

interface Props {
  groups: ReturnType<typeof groupMedicalRecords>
  expanded: Record<string, boolean>
  selectedPregnancy: string
  disabled: boolean
  onExpand: (id: string, open: boolean) => void
  onEdit: (record: MedicalRecord) => void
  onDelete: (record: MedicalRecord) => void
  onReminder: (record: MedicalRecord) => void
  onDownload: (fileId: string, name?: string) => void
}

export function MedicalRecordGroups({ groups, expanded, selectedPregnancy, disabled, onExpand, onEdit, onDelete, onReminder, onDownload }: Props) {
  return groups.map((group) => {
    const active = group.pregnancy?.status === 'ACTIVE'
    const open = expanded[group.id] ?? (active || selectedPregnancy === group.id)
    return <details className={`record-pregnancy-group${active ? ' is-current' : ''}`} key={group.id} open={open} onToggle={(event) => onExpand(group.id, event.currentTarget.open)}>
      <summary className="record-group-heading">
        <div><h2>{pregnancyLabel(group.pregnancy, group.id)}</h2><p>{group.pregnancy ? pregnancyStatusLabels[group.pregnancy.status] : 'Chưa tải được thông tin thai kỳ'}</p></div>
        <span className="record-group-count">{group.records.length} hồ sơ đã tải</span><CaretDown className="record-group-caret" size={20} aria-hidden />
      </summary>
      <div className="record-group-items">{group.records.map((record) => <article className="app-card record-item" key={record.id}>
        <FileText className="record-category-icon" size={28} weight="duotone" aria-hidden />
        <div><p className="card-kicker">{medicalRecordCategoryLabels[record.category] ?? 'Loại hồ sơ khác'}</p><h3>{record.title}</h3><p>{formatMedicalRecordDate(record.occurred_at)} · {record.facility_name || 'Chưa có cơ sở khám'}</p>{record.summary && <p>{record.summary}</p>}<MedicalRecordAttachments recordId={record.id} attachmentCount={record.attachment_count} attachments={record.attachments} onDownload={onDownload} /></div>
        <div className="record-actions">
          <button className="icon-button" type="button" aria-label={`Thêm lịch nhắc từ ${record.title}`} onClick={() => onReminder(record)} disabled={disabled}><CalendarPlus size={20} /></button>
          <button className="icon-button" type="button" aria-label={`Sửa hồ sơ ${record.title}`} onClick={() => onEdit(record)} disabled={disabled}><PencilSimple size={20} /></button>
          <button className="icon-danger" type="button" aria-label={`Xóa hồ sơ ${record.title}`} onClick={() => onDelete(record)} disabled={disabled}><Trash size={20} /></button>
        </div>
      </article>)}</div>
    </details>
  })
}
