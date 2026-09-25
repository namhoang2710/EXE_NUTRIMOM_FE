import type {
  AdminOnboardingStatus,
  AdminUserDetail,
  AdminUserListItem,
  AdminUserRole,
  AdminUsersPage,
  AdminUsersSummary,
  AdminUserStatus,
} from './admin-users'

export interface AdminUserListItemDto {
  id: string
  display_name: string | null
  phone: string
  email: string | null
  avatar_key: string | null
  roles: AdminUserRole[]
  status: AdminUserStatus
  onboarding_status: AdminOnboardingStatus
  created_at: string
  updated_at: string
}

export interface AdminUsersPageDto {
  items: AdminUserListItemDto[]
  page: number
  page_size: number
  total_items: number
  total_pages: number
}

export interface AdminUserDetailDto extends AdminUserListItemDto {
  gender: string | null
  date_of_birth: string | null
  terms_accepted_at: string | null
  privacy_accepted_at: string | null
  version: number
}

export interface AdminUsersSummaryDto {
  total_users: number
  active_users: number
  new_users_this_month: number
  current_period: {
    month: number
    year: number
    label: string
    timezone: string
  }
  monthly_progress: Array<{
    month: number
    month_label: string
    new_users: number
    cumulative_users: number
    percentage: number | null
    future: boolean
  }>
}

export function mapAdminUserListItem(dto: AdminUserListItemDto): AdminUserListItem {
  return {
    id: dto.id,
    displayName: dto.display_name,
    phone: dto.phone,
    email: dto.email,
    avatarKey: dto.avatar_key,
    roles: [...dto.roles],
    status: dto.status,
    onboardingStatus: dto.onboarding_status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export function mapAdminUsersPage(dto: AdminUsersPageDto): AdminUsersPage {
  return {
    items: dto.items.map(mapAdminUserListItem),
    page: dto.page,
    pageSize: dto.page_size,
    totalItems: dto.total_items,
    totalPages: dto.total_pages,
  }
}

export function mapAdminUserDetail(dto: AdminUserDetailDto): AdminUserDetail {
  return {
    ...mapAdminUserListItem(dto),
    gender: dto.gender,
    dateOfBirth: dto.date_of_birth,
    termsAcceptedAt: dto.terms_accepted_at,
    privacyAcceptedAt: dto.privacy_accepted_at,
    version: dto.version,
  }
}

export function mapAdminUsersSummary(dto: AdminUsersSummaryDto): AdminUsersSummary {
  return {
    totalUsers: dto.total_users,
    activeUsers: dto.active_users,
    newUsersThisMonth: dto.new_users_this_month,
    currentPeriod: { ...dto.current_period },
    monthlyProgress: dto.monthly_progress.map((item) => ({
      month: item.month,
      monthLabel: item.month_label,
      newUsers: item.new_users,
      cumulativeUsers: item.cumulative_users,
      percentage: item.percentage,
      future: item.future,
    })),
  }
}
