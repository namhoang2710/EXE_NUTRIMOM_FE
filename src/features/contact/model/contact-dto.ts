import type { Gender } from '@/features/user/model/user-types'

export type ContactTopic = 'POLICY' | 'APP_USAGE' | 'ACCOUNT' | 'OTHER'
export type ContactRequestStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

// Backend đặt `default-property-inclusion: non_null`, nên field null bị LOẠI KHỎI response
// thay vì trả về `null`. Vì vậy mọi field có thể null đều khai báo optional.

/** Yêu cầu hỗ trợ nhìn từ phía user (list và detail dùng chung shape này). */
export interface ContactRequestDto {
  id: string
  topic: ContactTopic
  message: string
  status: ContactRequestStatus
  created_at: string
  completed_at?: string | null
  cancelled_at?: string | null
}

/** Một dòng trong hộp thư admin; `message_preview` đã được server cắt 120 ký tự. */
export interface AdminContactSummaryDto {
  id: string
  topic: ContactTopic
  message_preview: string
  status: ContactRequestStatus
  user_id: string
  user_display_name: string
  user_phone: string
  created_at: string
  completed_at?: string | null
}

export interface ContactUserInfoDto {
  id: string
  display_name: string
  phone: string
  email?: string | null
  gender?: Gender | null
  date_of_birth?: string | null
}

export interface AdminContactDetailDto {
  id: string
  topic: ContactTopic
  message: string
  status: ContactRequestStatus
  created_at: string
  completed_at?: string | null
  completed_by?: string | null
  cancelled_at?: string | null
  user: ContactUserInfoDto
}

/** Envelope phân trang của backend, `page` bắt đầu từ 1. */
export interface ContactPageDto<T> {
  items: T[]
  page: number
  page_size: number
  total_items: number
  total_pages: number
}

export interface CreateContactRequestDto {
  topic: ContactTopic
  message: string
}

export interface UserContactListQuery {
  page: number
  pageSize: number
}

export interface AdminContactListQuery {
  page: number
  pageSize: number
  status?: ContactRequestStatus
  topic?: ContactTopic
  q?: string
}
