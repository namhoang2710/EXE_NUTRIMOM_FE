export const CONTACT_MESSAGE_MAX = 2000

/**
 * Kiểm tra phía client trước khi gọi API. Dùng `trim()` cho cả hai vế vì server
 * cũng trim trước khi validate (`ContactRequestService.create`).
 */
export function validateContactForm(topic: string, message: string) {
  const errors: Record<string, string> = {}
  const trimmed = message.trim()
  if (!topic) errors.topic = 'Vui lòng chọn chủ đề thắc mắc.'
  if (!trimmed) errors.message = 'Vui lòng nhập nội dung thắc mắc.'
  else if (trimmed.length > CONTACT_MESSAGE_MAX) errors.message = `Nội dung thắc mắc tối đa ${CONTACT_MESSAGE_MAX} ký tự.`
  return errors
}
