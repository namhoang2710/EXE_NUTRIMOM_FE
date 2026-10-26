import { NutritionButton } from './NutritionUI'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'

export function RegenerateDialog({
  busy,
  applyingProfile = false,
  onClose,
  onConfirm,
}: {
  busy: boolean
  applyingProfile?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <AccessibleDialog
      open
      title={applyingProfile ? 'Áp dụng hồ sơ mới' : 'Tạo lại thực đơn'}
      onClose={onClose}
      busy={busy}
      className="nutrition-dialog"
    >
      <p>
        {applyingProfile ? 'Áp dụng sở thích, ngân sách và hồ sơ mới nhất cho thực đơn hiện tại. ' : ''}
        Các bữa đã ghi nhật ký được giữ nguyên, kể cả món tự nhập hoặc món ngoài thực đơn.
        Phần còn lại được tạo lại theo hồ sơ hiện tại; các món bạn đang giữ vẫn được giữ.
      </p>
      <p>Nếu món đang giữ xung đột với điều kiện bắt buộc, hãy chủ động đổi hoặc bỏ giữ món đó trước.</p>
      <div className="nutrition-actions">
        <NutritionButton
          className="nutrition-button is-primary"
          disabled={busy}
          onClick={onConfirm}
        >
          {applyingProfile ? 'Xác nhận áp dụng' : 'Xác nhận tạo lại'}
        </NutritionButton>
        <NutritionButton
          className="nutrition-button"
          disabled={busy}
          onClick={onClose}
        >
          Hủy
        </NutritionButton>
      </div>
    </AccessibleDialog>
  )
}
