import { isSlotUnavailableError } from './consultation-errors.ts'

interface SubmissionCallbacks<T> {
  submit: () => Promise<T>
  onSuccess: (value: T) => void | Promise<void>
  onError: (error: unknown) => void
  onSlotConflict?: () => void | Promise<void>
}

export async function runConsultationSubmission<T>({ submit, onSuccess, onError, onSlotConflict }: SubmissionCallbacks<T>) {
  try {
    const value = await submit()
    await onSuccess(value)
    return true
  } catch (error) {
    if (isSlotUnavailableError(error) && onSlotConflict) await onSlotConflict()
    else onError(error)
    return false
  }
}
