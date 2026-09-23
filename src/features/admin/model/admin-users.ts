export const adminUserRoles = [
  'USER',
  'EXPERT',
  'CONTENT_EDITOR',
  'CONTENT_REVIEWER',
  'CONTENT_PUBLISHER',
  'ADMIN',
] as const

export const adminUserStatuses = ['ACTIVE', 'LOCKED', 'DISABLED'] as const
export const adminOnboardingStatuses = ['PROFILE_REQUIRED', 'CONTEXT_REQUIRED', 'COMPLETED'] as const
export const adminUserSortFields = ['displayName', 'status', 'createdAt', 'updatedAt'] as const
export const adminUserPageSizes = [10, 20, 50, 100] as const

export type AdminUserRole = (typeof adminUserRoles)[number]
export type AdminUserStatus = (typeof adminUserStatuses)[number]
export type AdminOnboardingStatus = (typeof adminOnboardingStatuses)[number]
export type AdminUserSortField = (typeof adminUserSortFields)[number]
export type AdminUserSortDirection = 'asc' | 'desc'

export interface AdminUserListItem {
  id: string
  displayName: string | null
  phone: string
  email: string | null
  avatarKey: string | null
  roles: AdminUserRole[]
  status: AdminUserStatus
  onboardingStatus: AdminOnboardingStatus
  createdAt: string
  updatedAt: string
}

export interface AdminUsersPage {
  items: AdminUserListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface AdminUserDetail extends AdminUserListItem {
  gender: string | null
  dateOfBirth: string | null
  termsAcceptedAt: string | null
  privacyAcceptedAt: string | null
  version: number
}

export interface AdminUsersCurrentPeriod {
  month: number
  year: number
  label: string
  timezone: string
}

export interface AdminUsersMonthlyProgress {
  month: number
  monthLabel: string
  newUsers: number
  cumulativeUsers: number
  percentage: number | null
  future: boolean
}

export interface AdminUsersSummary {
  totalUsers: number
  activeUsers: number
  newUsersThisMonth: number
  currentPeriod: AdminUsersCurrentPeriod
  monthlyProgress: AdminUsersMonthlyProgress[]
}

export interface AdminUsersQuery {
  page: number
  pageSize: number
  q?: string
  status?: AdminUserStatus
  role?: AdminUserRole
  onboardingStatus?: AdminOnboardingStatus
  sortBy: AdminUserSortField
  sortDirection: AdminUserSortDirection
}

export const defaultAdminUsersQuery: AdminUsersQuery = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortDirection: 'desc',
}

function isOneOf<T extends string>(value: string | null, values: readonly T[]): value is T {
  return value !== null && values.includes(value as T)
}

function positiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function readAdminUsersQuery(search: URLSearchParams | string): AdminUsersQuery {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const status = params.get('status')
  const role = params.get('role')
  const onboardingStatus = params.get('onboardingStatus')
  const sortBy = params.get('sortBy')
  const sortDirection = params.get('sortDirection')
  const requestedPageSize = positiveInteger(params.get('pageSize'), defaultAdminUsersQuery.pageSize)
  const q = params.get('q')?.trim()

  return {
    page: positiveInteger(params.get('page'), defaultAdminUsersQuery.page),
    pageSize: adminUserPageSizes.includes(requestedPageSize as (typeof adminUserPageSizes)[number])
      ? requestedPageSize
      : defaultAdminUsersQuery.pageSize,
    q: q || undefined,
    status: isOneOf(status, adminUserStatuses) ? status : undefined,
    role: isOneOf(role, adminUserRoles) ? role : undefined,
    onboardingStatus: isOneOf(onboardingStatus, adminOnboardingStatuses) ? onboardingStatus : undefined,
    sortBy: isOneOf(sortBy, adminUserSortFields) ? sortBy : defaultAdminUsersQuery.sortBy,
    sortDirection: sortDirection === 'asc' || sortDirection === 'desc'
      ? sortDirection
      : defaultAdminUsersQuery.sortDirection,
  }
}

export function buildAdminUsersQueryString(query: AdminUsersQuery) {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  if (query.q?.trim()) params.set('q', query.q.trim())
  if (query.status) params.set('status', query.status)
  if (query.role) params.set('role', query.role)
  if (query.onboardingStatus) params.set('onboardingStatus', query.onboardingStatus)
  params.set('sortBy', query.sortBy)
  params.set('sortDirection', query.sortDirection)
  return `?${params.toString()}`
}

export function formatAdminUserEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part, index) => index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join(' ')
}

export interface ChartPoint {
  x: number
  y: number
  value: number
  item: AdminUsersMonthlyProgress
}

export interface AdminUsersChartGeometry {
  points: ChartPoint[]
  linePath: string
  areaPath: string
}

export function buildAdminUsersChartGeometry(
  items: AdminUsersMonthlyProgress[],
  width = 720,
  height = 220,
): AdminUsersChartGeometry {
  const left = 46
  const right = 16
  const top = 14
  const bottom = 34
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const validItems = items.filter((item) => !item.future && item.percentage !== null && Number.isFinite(item.percentage))
  const points = validItems.map((item) => {
    const monthIndex = Math.min(11, Math.max(0, item.month - 1))
    const value = Math.min(100, Math.max(0, item.percentage ?? 0))
    return {
      x: left + (monthIndex / 11) * plotWidth,
      y: top + ((100 - value) / 100) * plotHeight,
      value,
      item,
    }
  })
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
  const baseline = top + plotHeight
  const areaPath = points.length === 0
    ? ''
    : `${linePath} L ${points.at(-1)?.x.toFixed(2)} ${baseline.toFixed(2)} L ${points[0].x.toFixed(2)} ${baseline.toFixed(2)} Z`
  return { points, linePath, areaPath }
}
