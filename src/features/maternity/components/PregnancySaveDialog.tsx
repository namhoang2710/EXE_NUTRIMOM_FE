import { CalendarHeart, Heartbeat, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { WanderingEyes } from '@/components/loading-ui/wandering-eyes'
import { formatDate } from '@/core/auth/date'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { runAsyncAction } from '@/shared/model/async-action'
import type { PregnancyCalculation } from '@/types/domain'

const LOADING_TEXT = 'Chờ mình xíu nhá, đang thiết lập ạ'

interface PregnancySaveDialogProps {
  preview: PregnancyCalculation | null
  open: boolean
  onClose: () => void
  onAction: () => Promise<void>
  onSaved: () => void
  errorMessage: (error: unknown) => string
}

export function PregnancySaveDialog({ preview, open, onClose, onAction, onSaved, errorMessage }: PregnancySaveDialogProps) {
  const [stage, setStage] = useState<'confirm' | 'loading' | 'error'>('confirm')
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  useEffect(() => {
    if (open) { setStage('confirm'); setError('') }
  }, [open])

  if (!preview) return null

  async function confirm() {
    if (inFlight.current) return
    inFlight.current = true
    setStage('loading')
    setError('')
    try {
      await runAsyncAction({ action: onAction, minimumMs: 5000 })
      onSaved()
    } catch (reason) {
      setError(errorMessage(reason))
      setStage('error')
    } finally {
      inFlight.current = false
    }
  }

  const loading = stage === 'loading'
  return (
    <AccessibleDialog
      open={open}
      title={loading ? 'Đang thiết lập hành trình' : 'Xác nhận thông tin thai kỳ'}
      description={loading ? undefined : 'Kiểm tra lại kết quả trước khi lưu vào hồ sơ của bạn.'}
      onClose={onClose}
      busy={loading}
      stable
      className="pregnancy-save-dialog"
      footer={loading ? undefined : <><button className="secondary-button" type="button" onClick={onClose}>Quay lại</button><button className="primary-button" type="button" onClick={() => void confirm()}>{stage === 'error' ? 'Thử lưu lại' : 'Xác nhận'}</button></>}
    >
      {loading ? <div className="pregnancy-setup-loader" role="status" aria-live="polite">
        <span className="sr-only">{LOADING_TEXT}</span>
        <WanderingEyes />
        <span className="pregnancy-typewriter" aria-hidden="true">{LOADING_TEXT}</span>
      </div> : <div className="pregnancy-confirm-summary">
        <div><Heartbeat size={24} weight="duotone" /><span>Tuổi thai sắp lưu</span><strong>Tuần {preview.gestational_week} · Ngày {preview.gestational_day}</strong></div>
        <div><CalendarHeart size={24} weight="duotone" /><span>Ngày dự sinh</span><strong>{formatDate(preview.estimated_due_date)}</strong></div>
        {stage === 'error' && <p className="nm-dialog-error" role="alert"><WarningCircle size={18} aria-hidden="true" />{error}</p>}
      </div>}
    </AccessibleDialog>
  )
}
