export function getPregnancyStageImageUrl(week: number): string | null {
  if (!Number.isFinite(week)) return null

  const wholeWeek = Math.floor(week)
  if (wholeWeek <= 3) return '/pregnancy-weeks/T1-3.png'
  if (wholeWeek >= 41) return '/pregnancy-weeks/T41.png'
  return `/pregnancy-weeks/T${wholeWeek}.png`
}

export function getPregnancyStageAltText(week: number, day?: number) {
  if (!Number.isFinite(week)) return 'Hình minh họa hành trình thai kỳ'

  const wholeWeek = Math.max(0, Math.floor(week))
  const dayDetail = Number.isFinite(day) ? `, ngày ${Math.max(0, Math.floor(day!))}` : ''
  if (wholeWeek <= 3) return `Hình minh họa giai đoạn đầu của thai kỳ, tuần ${wholeWeek}${dayDetail}`
  return `Hình minh họa thai nhi ở tuần ${wholeWeek}${dayDetail}`
}
