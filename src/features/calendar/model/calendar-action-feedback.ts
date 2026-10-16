export const CALENDAR_TOAST_DURATION = 4000

export async function runCalendarAction<T>(action: () => Promise<T>, onSuccess: (result: T) => void) {
  const result = await action()
  onSuccess(result)
  return result
}

export function scheduleCalendarToastDismiss(
  onClose: () => void,
  schedule: (handler: () => void, delay: number) => number = (handler, delay) => window.setTimeout(handler, delay),
  cancel: (timer: number) => void = (timer) => window.clearTimeout(timer),
) {
  const timer = schedule(onClose, CALENDAR_TOAST_DURATION)
  return () => cancel(timer)
}
