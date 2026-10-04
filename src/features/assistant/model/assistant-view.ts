import type { AssistantMessageDto, AssistantUserOverview } from './assistant-dto.ts'

const routes = new Set(['/app', '/app/profile', '/app/profile/health', '/app/profile/records', '/app/profile/care', '/app/profile/saved', '/app/profile/support', '/app/profile/account/password', '/app/profile/account/disable', '/app/knowledge', '/app/experts', '/app/consultations', '/app/consultations/history', '/app/pricing', '/app/family', '/app/nutrition', '/app/settings', '/app/assistant', '/app/calendar', '/app/chat', '/app/community', '/app/dashboard', '/app/appointment-questions'])
export function isAssistantHref(href: string) {
  return routes.has(href) || /^\/app\/knowledge\/[\p{L}\p{N}_-]+$/u.test(href)
}
export function safeAssistantMessage(message: AssistantMessageDto): AssistantMessageDto {
  return { ...message, citations: (message.citations || []).filter(s => isAssistantHref(s.href)), actions: (message.actions || []).filter(a => isAssistantHref(a.href)) }
}
export function safeAssistantOverview(overview: AssistantUserOverview): AssistantUserOverview {
  return { ...overview, items: overview.items.filter(item => isAssistantHref(item.href)) }
}
export const contextLabels: Record<string, string> = {
  WEBSITE_GUIDE: 'Hướng dẫn web', PUBLISHED_ARTICLES: 'Bài viết', PROFILE: 'Hồ sơ cá nhân', PREGNANCY: 'Thai kỳ', MEDICAL_RECORDS: 'Hồ sơ y tế',
  CARE_PLAN: 'Chăm sóc', SUBSCRIPTION: 'Gói dịch vụ', CONSULTATIONS: 'Lịch tư vấn', SAVED_ARTICLES: 'Bài đã lưu', FAMILY: 'Gia đình', SUPPORT: 'Hỗ trợ', PAYMENTS: 'Giao dịch',
}
export function assistantSuggestions(path: string) {
  if (path.startsWith('/app/profile/records')) return ['Tôi lưu kết quả khám như thế nào?', 'Tóm tắt hồ sơ y tế gần đây của tôi', 'Trợ lý có đọc được file xét nghiệm không?']
  if (path.startsWith('/app/profile/health')) return ['Thai kỳ hiện tại của tôi ở tuần nào?', 'Tôi cập nhật ngày dự sinh ở đâu?', 'Có bài viết nào phù hợp với tuần thai của tôi?']
  if (path.startsWith('/app/pricing')) return ['Tôi thanh toán gói dịch vụ như thế nào?', 'Tôi kiểm tra kết quả thanh toán ở đâu?', 'Tôi cần hỗ trợ về tài khoản']
  if (path.startsWith('/app/knowledge') || path.startsWith('/app/nutrition')) return ['Gợi ý bài viết dinh dưỡng phù hợp với tôi', 'Tôi xem lại bài viết đã lưu ở đâu?', 'Trang Dinh dưỡng hiện có những chức năng gì?']
  return ['Hướng dẫn tôi sử dụng NutriMom', 'Gợi ý bài viết phù hợp với thai kỳ của tôi', 'Tôi lưu hồ sơ sức khỏe như thế nào?']
}
export function fallbackLabel(reason: string | null) {
  switch (reason) {
    case 'NOT_READY': return 'AI chưa sẵn sàng. Đây là hướng dẫn có sẵn của NutriMom.'
    case 'CONSENT_REQUIRED': return 'Đang dùng hướng dẫn có sẵn. Bạn có thể bật xử lý qua AI trong Cá nhân hóa.'
    case 'DAILY_LIMIT': return 'Đã hết lượt AI khả dụng hôm nay. Bạn vẫn có thể tra cứu hướng dẫn.'
    case 'PROVIDER_LIMIT': return 'AI đang đạt giới hạn sử dụng. NutriMom đang trả lời bằng hướng dẫn có sẵn.'
    case 'TIMEOUT': return 'AI phản hồi chậm. Đây là hướng dẫn có sẵn để bạn tiếp tục.'
    case 'PROVIDER_UNAVAILABLE':
    case 'INVALID_RESPONSE': return 'AI chưa trả lời được câu hỏi này. Đây là hướng dẫn có sẵn của NutriMom.'
    default: return null
  }
}
