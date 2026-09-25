import type {
  AdminContactListQuery,
  ContactPageDto,
  ContactRequestStatus,
  ContactTopic,
  UserContactListQuery,
} from './contact-dto'
import { isContactStatus, isContactTopic } from './contact-labels.ts'

export const USER_CONTACT_PAGE_SIZE = 5
export const ADMIN_CONTACT_PAGE_SIZE = 20
/** Khớp `adminUserPageSizes` để hai bảng admin có cùng lựa chọn; backend cho phép 1–100. */
export const ADMIN_CONTACT_PAGE_SIZES = [10, 20, 50, 100] as const

/** Giá trị giả trong URL để nói "bỏ lọc trạng thái"; API hiểu "tất cả" là bỏ trống tham số. */
export const ADMIN_STATUS_ALL = 'ALL'

export type AdminStatusFilter = ContactRequestStatus | typeof ADMIN_STATUS_ALL

export interface AdminContactFilters {
  page: number
  pageSize: number
  statusFilter: AdminStatusFilter
  topic?: ContactTopic
  q?: string
}

/** Query param của backend là camelCase (`pageSize`), khác với body snake_case. */
export function buildContactQueryString(query: object) {
  const params = new URLSearchParams()
  Object.entries(query as Record<string, string | number | boolean | undefined>).forEach(([name, value]) => {
    if (value !== undefined && value !== '') params.set(name, String(value))
  })
  const value = params.toString()
  return value ? `?${value}` : ''
}

function readPage(params: URLSearchParams) {
  const parsed = Number(params.get('page') ?? 1)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

export function readUserContactQuery(search: string): UserContactListQuery {
  return { page: readPage(new URLSearchParams(search)), pageSize: USER_CONTACT_PAGE_SIZE }
}

/**
 * URL trống = tất cả trạng thái (bỏ hẳn tham số `status` khi gọi API).
 * Giá trị lạ bị loại bỏ tại đây để không bao giờ gửi lên enum sai (backend trả 400).
 */
export function readAdminContactQuery(search: string): AdminContactFilters {
  const params = new URLSearchParams(search)
  const status = params.get('status')?.trim() ?? ''
  const topic = params.get('topic')?.trim() ?? ''
  const q = params.get('q')?.trim() ?? ''
  const requestedSize = Number(params.get('pageSize'))
  return {
    page: readPage(params),
    // Allow-list để URL sửa tay không gửi lên pageSize ngoài khoảng backend chấp nhận.
    pageSize: (ADMIN_CONTACT_PAGE_SIZES as readonly number[]).includes(requestedSize) ? requestedSize : ADMIN_CONTACT_PAGE_SIZE,
    statusFilter: isContactStatus(status) ? status : ADMIN_STATUS_ALL,
    topic: isContactTopic(topic) ? topic : undefined,
    q: q || undefined,
  }
}

export function toAdminListQuery(filters: AdminContactFilters): AdminContactListQuery {
  return {
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.statusFilter === ADMIN_STATUS_ALL ? undefined : filters.statusFilter,
    topic: filters.topic,
    q: filters.q,
  }
}

export function hasAdminContactFilters(filters: AdminContactFilters) {
  return filters.statusFilter !== ADMIN_STATUS_ALL || Boolean(filters.topic) || Boolean(filters.q)
}

/**
 * Backend trả lại đúng `page` được yêu cầu (`source.getNumber() + 1`), nên xin trang 5
 * của kết quả 2 trang sẽ nhận về danh sách rỗng. Tự lùi về trang cuối còn dữ liệu.
 */
export function clampContactPage(page: ContactPageDto<unknown>) {
  if (page.items.length > 0 || page.page <= 1) return page.page
  return Math.max(1, page.total_pages)
}
