import { ApiClientError } from '@/core/api/api-error'

const familyErrorMessages: Record<string, string> = {
  ACTIVE_PREGNANCY_NOT_FOUND: 'Bạn cần tạo hồ sơ thai kỳ đang hoạt động trước khi lập nhóm gia đình.',
  FAMILY_GROUP_NOT_FOUND: 'Bạn chưa thuộc nhóm gia đình đang hoạt động.',
  SHARING_SCOPE_REQUIRED: 'Bạn chưa được cấp quyền sử dụng nội dung này.',
  INVALID_INVITATION_TOKEN: 'Token lời mời không hợp lệ.',
  INVITATION_EXPIRED: 'Lời mời đã hết hạn.',
  INVITATION_ALREADY_USED: 'Lời mời này đã được sử dụng.',
  INVITATION_TARGET_MISMATCH: 'Lời mời không dành cho tài khoản đang đăng nhập.',
  OWNER_ALREADY_IN_GROUP: 'Chủ thai kỳ đã có nhóm gia đình.',
  FAMILY_MEMBER_EXISTS: 'Tài khoản này đã là thành viên của nhóm.',
  VERSION_CONFLICT: 'Dữ liệu đã thay đổi ở nơi khác. Vui lòng tải lại trước khi tiếp tục.',
  VALIDATION_ERROR: 'Vui lòng kiểm tra lại thông tin đã nhập.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
}
export function familyErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) return familyErrorMessages[error.code] || error.message
  return error instanceof Error ? error.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.'
}

export function isFamilyError(error: unknown, code: string) {
  return error instanceof ApiClientError && error.code === code
}

