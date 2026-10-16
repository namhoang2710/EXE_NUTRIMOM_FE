export type ActionDialogState =
  | { stage: 'confirm'; error: string }
  | { stage: 'busy'; error: string }
  | { stage: 'success'; error: string }

export type ActionDialogEvent =
  | { type: 'RESET' }
  | { type: 'START' }
  | { type: 'SUCCEED' }
  | { type: 'FAIL'; error: string }

export const initialActionDialogState: ActionDialogState = { stage: 'confirm', error: '' }

export function actionDialogReducer(_state: ActionDialogState, event: ActionDialogEvent): ActionDialogState {
  if (event.type === 'START') return { stage: 'busy', error: '' }
  if (event.type === 'SUCCEED') return { stage: 'success', error: '' }
  if (event.type === 'FAIL') return { stage: 'confirm', error: event.error }
  return initialActionDialogState
}

export async function performDialogAction(
  action: () => Promise<void>,
  dispatch: (event: ActionDialogEvent) => void,
  errorMessage: (error: unknown) => string,
  completion: { closeOnSuccess?: boolean; onCompleted?: () => void; onClose?: () => void } = {},
) {
  dispatch({ type: 'START' })
  try {
    await action()
  } catch (error) {
    dispatch({ type: 'FAIL', error: errorMessage(error) })
    return false
  }
  dispatch({ type: completion.closeOnSuccess ? 'RESET' : 'SUCCEED' })
  completion.onCompleted?.()
  if (completion.closeOnSuccess) completion.onClose?.()
  return true
}
