export function normalizeConsultationRating(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(1, Math.min(5, Math.round(value)))
}
