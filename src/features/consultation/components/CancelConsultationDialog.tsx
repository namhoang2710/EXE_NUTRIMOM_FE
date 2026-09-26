import { Warning } from '@phosphor-icons/react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { formatConsultationDate, formatConsultationTime } from '../model/consultation-formatters'
import type { ConsultationRequest } from '../model/consultation-types'

export function CancelConsultationDialog({ item, busy, error, onClose, onConfirm }: { item: ConsultationRequest | null; busy: boolean; error: string | null; onClose: () => void; onConfirm: () => void }) {
  const schedule = item?.slot ? `${formatConsultationDate(item.slot.date)}, ${formatConsultationTime(item.slot.startTime)} - ${formatConsultationTime(item.slot.endTime)}` : 'Chưa có khung giờ'
  return <AccessibleDialog open={Boolean(item)} title="Hủy lịch tư vấn?" description="Yêu cầu này sẽ được chuyển sang trạng thái đã hủy." onClose={onClose} busy={busy} className="consultation-dialog">
    <div className="consultation-dialog-summary"><Warning size={26} weight="duotone" aria-hidden="true" /><div><strong>{item?.expertName || 'Đang chờ chuyên gia'}</strong><span>{schedule}</span></div></div>
    {error && <p className="consultation-form-error" role="alert">{error}</p>}
    <div className="consultation-dialog-actions"><button type="button" className="consultation-secondary-button" disabled={busy} onClick={onClose}>Giữ lịch</button><button type="button" className="consultation-danger-button" disabled={busy} onClick={onConfirm}>{busy ? 'Đang hủy...' : 'Xác nhận hủy'}</button></div>
  </AccessibleDialog>
}
