import { CheckCircle } from '@phosphor-icons/react'
import { AccessibleDialog } from './AccessibleDialog'

interface SuccessDialogProps {
  open: boolean
  message: string
  onClose: () => void
}

export function SuccessDialog({ open, message, onClose }: SuccessDialogProps) {
  return (
    <AccessibleDialog open={open} title="Hoàn tất" onClose={onClose} stable className="nm-action-dialog" footer={<button className="primary-button" type="button" onClick={onClose}>OK</button>}>
      <div className="nm-action-dialog-state nm-action-dialog-success" role="status"><CheckCircle size={38} weight="fill" /><p>{message}</p></div>
    </AccessibleDialog>
  )
}
