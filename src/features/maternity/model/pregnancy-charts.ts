export interface PregnancyWeekWindow {
  start: number
  end: number
  weeks: number[]
}

const WEEK_WINDOWS = [[1, 8], [9, 14], [15, 20], [21, 26], [27, 32], [33, 38], [39, 42]] as const

export function getPregnancyWeekWindow(rawWeek: number): PregnancyWeekWindow {
  const week = Math.min(42, Math.max(0, Math.floor(Number.isFinite(rawWeek) ? rawWeek : 0)))
  const [start, end] = week === 0 ? [0, 8] : WEEK_WINDOWS.find(([from, to]) => week >= from && week <= to) ?? [39, 42]
  return { start, end, weeks: Array.from({ length: end - start + 1 }, (_, index) => start + index) }
}

export interface PregnancyProgress {
  elapsedDays: number
  progressPercent: number
  remainingDays: number
}

export function calculatePregnancyProgress(daysUntilDue: number): PregnancyProgress {
  const safeDays = Number.isFinite(daysUntilDue) ? daysUntilDue : 280
  const elapsedDays = Math.min(280, Math.max(0, 280 - safeDays))
  return {
    elapsedDays,
    progressPercent: elapsedDays / 280 * 100,
    remainingDays: Math.max(0, Math.ceil(safeDays)),
  }
}

export function hasValidDueDate(value: string | null | undefined) {
  if (!value) return false
  return !Number.isNaN(new Date(value).getTime())
}
