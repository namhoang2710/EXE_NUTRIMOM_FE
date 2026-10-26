/**
 * Đường dẫn quay lại Cộng đồng sau đăng nhập/đăng ký.
 *
 * Chỉ nhận đúng `/app/community` với `post` (uuid) và `topic` (chữ in hoa) — mọi thứ khác (domain
 * ngoài, `//host`, đường dẫn lạ, query lạ) đều quy về `/app/community`. Không bao giờ trả URL tuyệt đối.
 */
export const COMMUNITY_HOME = '/app/community'
const STORAGE_KEY = 'nutrimom:auth-return'
const STORAGE_TTL_MS = 30 * 60_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOPIC = /^[A-Z_]{2,30}$/

export function safeCommunityPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith(COMMUNITY_HOME)) return COMMUNITY_HOME
  let parsed: URL
  try {
    parsed = new URL(value, 'https://nutrimom.invalid')
  } catch {
    return COMMUNITY_HOME
  }
  if (parsed.origin !== 'https://nutrimom.invalid' || parsed.pathname !== COMMUNITY_HOME || parsed.hash) return COMMUNITY_HOME
  const query = new URLSearchParams()
  const post = parsed.searchParams.get('post')
  const topic = parsed.searchParams.get('topic')
  if (post && UUID.test(post)) query.set('post', post)
  if (topic && TOPIC.test(topic)) query.set('topic', topic)
  const text = query.toString()
  return text ? `${COMMUNITY_HOME}?${text}` : COMMUNITY_HOME
}

/** Lưu tạm đường dẫn đích cho luồng kích hoạt bằng email (mở ở tab mới nên mất `location.state`). */
export function rememberReturnPath(path: string, now = Date.now()) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ path: safeCommunityPath(path), at: now }))
  } catch { /* Trình duyệt chặn storage: chỉ mất tiện ích quay lại, không ảnh hưởng đăng nhập. */ }
}

/**
 * Đọc (không xoá) đường dẫn đích còn hạn. Các bước giữa đường (kích hoạt, hồ sơ lần đầu, route guard)
 * chỉ đọc; trang Cộng đồng gọi {@link clearReturnPath} khi người dùng đã tới nơi.
 */
export function peekReturnPath(now = Date.now()) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { path?: unknown; at?: unknown }
    if (typeof parsed.at !== 'number' || now - parsed.at > STORAGE_TTL_MS || now < parsed.at) {
      localStorage.removeItem(STORAGE_KEY)
      return undefined
    }
    return safeCommunityPath(parsed.path)
  } catch {
    return undefined
  }
}

export function clearReturnPath() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* Không có storage thì không có gì để xoá. */ }
}
