export const CONSULTATION_PAGE_SIZE = 20

export function buildConsultationListQuery(page: number, pageSize = CONSULTATION_PAGE_SIZE) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return `?${params.toString()}`
}

export function buildExpertSlotsQuery(date: string) {
  return `?${new URLSearchParams({ date }).toString()}`
}
