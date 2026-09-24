import type { ConsultationQuery, ReviewQuery, SlotQuery } from './expert-console-types'

type QueryValue = string | number | boolean | undefined

export function toQueryString(values: Record<string, QueryValue>) {
  const query = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

export function buildSlotQuery(query: SlotQuery) {
  return toQueryString({ date: query.date, from: query.from, to: query.to, status: query.status })
}

export function buildConsultationQuery(query: ConsultationQuery) {
  return toQueryString({ type: query.type, status: query.status, from: query.from, to: query.to, q: query.query?.trim(), page: query.page, pageSize: query.pageSize })
}

export function buildReviewQuery(query: ReviewQuery) {
  return toQueryString({ rating: query.rating, from: query.from, to: query.to, sort: query.sort, has_comment: query.hasComment, page: query.page, pageSize: query.pageSize })
}

