import type { ActivityEvent, ActivityPage, CreateInvitationInput, FamilyTaskStatus } from './family-types'

function queryString(params: Record<string, string | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => { if (value) query.set(key, value) })
  const result = query.toString()
  return result ? `?${result}` : ''
}
export function invitationBody(input: CreateInvitationInput) {
  const phone = input.invited_phone?.trim()
  const email = input.invited_email?.trim()
  if (Boolean(phone) === Boolean(email)) throw new Error('Chỉ nhập số điện thoại hoặc email của người được mời.')
  return {
    ...(phone ? { invited_phone: phone } : { invited_email: email }),
    relationship: input.relationship,
    scopes: input.scopes,
    ...(input.expires_in_hours ? { expires_in_hours: input.expires_in_hours } : {}),
  }
}

export function buildTasksPath(filters: { assignee_id?: string; status?: FamilyTaskStatus }) {
  return `/family/tasks${queryString(filters)}`
}

export function buildActivityPath(cursor?: string) {
  return `/activity-feed${queryString({ limit: '20', cursor })}`
}

export interface ActivityFeedState {
  items: ActivityEvent[]
  nextCursor?: string
  hasMore: boolean
}

export function activityFeedNextState(current: ActivityFeedState, page: ActivityPage, reset: boolean): ActivityFeedState {
  return {
    items: reset ? page.items : [...current.items, ...page.items.filter((item) => !current.items.some((existing) => existing.id === item.id))],
    nextCursor: page.next_cursor,
    hasMore: page.has_more,
  }
}

export function resetActivityFeedState(): ActivityFeedState {
  return { items: [], nextCursor: undefined, hasMore: false }
}

