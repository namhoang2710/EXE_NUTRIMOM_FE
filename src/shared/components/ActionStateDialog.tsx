import { CheckCircle, CircleNotch, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useReducer, useRef } from 'react'
import { AccessibleDialog } from './AccessibleDialog'
import { actionDialogReducer, initialActionDialogState, performDialogAction } from '@/shared/model/action-dialog-state'
import { createAsyncActionGate } from '@/shared/model/async-action'

interface ActionStateDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  busyLabel?: string
  successMessage: string
  danger?: boolean
  onAction: () => Promise<void>
  onClose: () => void
  onCompleted?: () => void
  errorMessage: (error: unknown) => string
}

export function ActionStateDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  busyLabel = 'Đang xử lý...',
  successMessage,
  danger = false,
  onAction,
  onClose,
  onCompleted,
  errorMessage,
}: ActionStateDialogProps) {
  const [state, dispatch] = useReducer(actionDialogReducer, initialActionDialogState)
  const gate = useRef(createAsyncActionGate())

  useEffect(() => { if (open) dispatch({ type: 'RESET' }) }, [open])

  async function confirm() {
    await gate.current.run(async () => {
      const completed = await performDialogAction(onAction, dispatch, errorMessage)
      if (completed) onCompleted?.()
    })
  }

  function closeDialog() {
    dispatch({ type: 'RESET' })
    onClose()
  }

  const busy = state.stage === 'busy'
  const success = state.stage === 'success'
  return (
    <AccessibleDialog
      open={open}
      title={success ? 'Hoàn tất' : title}
      description={success ? undefined : description}
      onClose={closeDialog}
      busy={busy}
      stable
      className="nm-action-dialog"
      footer={success ? (
        <button className="primary-button" type="button" onClick={closeDialog}>OK</button>
      ) : (
        <>
          <button className="secondary-button" type="button" disabled={busy} onClick={closeDialog}>{cancelLabel}</button>
          <button className={danger ? 'danger-submit' : 'primary-button'} type="button" disabled={busy} onClick={() => void confirm()}>{busy ? busyLabel : confirmLabel}</button>
        </>
      )}
    >
      {success ? (
        <div className="nm-action-dialog-state nm-action-dialog-success" role="status"><CheckCircle size={36} weight="fill" /><p>{successMessage}</p></div>
      ) : busy ? (
        <div className="nm-action-dialog-state" role="status"><CircleNotch className="nm-dialog-spinner" size={32} weight="bold" /><p>{busyLabel}</p></div>
      ) : (
        <div className="nm-action-dialog-state"><WarningCircle size={34} weight="duotone" />{state.error && <p className="nm-dialog-error" role="alert">{state.error}</p>}</div>
      )}
    </AccessibleDialog>
  )
}
