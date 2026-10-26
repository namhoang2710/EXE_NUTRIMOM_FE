export interface ReviewReply { content: string; replied_at: string; updated_at?: string }
export function reviewDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Chưa có thời gian' : new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}
export interface PublicReview {
  id: string; rating: number; content: string; author: { display_name: string }; created_at: string; edited_at?: string; reply?: ReviewReply;
}
export interface ReviewSummary { average?: number; total: number; by_rating: Record<'1' | '2' | '3' | '4' | '5', number> }
export interface MyReview {
  id: string; rating: number; content: string; status: 'PUBLISHED' | 'HIDDEN'; version: number;
  hidden_reason?: string; reply?: ReviewReply; created_at: string; edited_at?: string;
}
export interface AdminReview extends Omit<MyReview, 'status'> {
  status: 'PUBLISHED' | 'HIDDEN' | 'DELETED'; author: { id: string; display_name: string; email_masked?: string; phone_masked?: string; account_status: string };
  edited_after_reply: boolean; replied_by?: string; hidden_at?: string; deleted_at?: string;
}
export interface ReviewPage<T> { items: T[]; next_cursor?: string; has_more: boolean }
export interface ReviewFilters { rating?: string; status?: string; has_reply?: string; q?: string }

function validReview(value: unknown): value is PublicReview {
  const row = value as PublicReview | null
  return Boolean(row && typeof row.id === 'string' && row.id && Number.isInteger(row.rating) && row.rating >= 1 && row.rating <= 5 && typeof row.content === 'string' && typeof row.created_at === 'string' && Number.isFinite(Date.parse(row.created_at))
    && (!row.reply || (typeof row.reply.content === 'string' && Number.isFinite(Date.parse(row.reply.replied_at)))))
}
export function parseReviewPage<T extends PublicReview>(value: unknown, admin = false): ReviewPage<T> {
  const page = value as ReviewPage<T> | null
  if (!page || !Array.isArray(page.items) || typeof page.has_more !== 'boolean' || (page.next_cursor !== undefined && typeof page.next_cursor !== 'string') || (page.has_more && !page.next_cursor)) throw new Error('Dữ liệu danh sách đánh giá chưa hợp lệ.')
  if (page.items.some(row => !validReview(row) || !row.author || typeof row.author.display_name !== 'string' || (admin && (!Number.isSafeInteger((row as unknown as AdminReview).version) || !['PUBLISHED', 'HIDDEN', 'DELETED'].includes((row as unknown as AdminReview).status))))) throw new Error('Dữ liệu đánh giá chưa hợp lệ.')
  return { items: page.items.map(row => admin ? row : ({ id: row.id, rating: row.rating, content: row.content, created_at: row.created_at, author: { display_name: row.author.display_name }, ...(row.edited_at ? { edited_at: row.edited_at } : {}), ...(row.reply ? { reply: row.reply } : {}) }) as T), has_more: page.has_more, ...(page.next_cursor ? { next_cursor: page.next_cursor } : {}) }
}
export function parseOwnReview(value: unknown): MyReview | null {
  if (value === null) return null
  const row = value as MyReview
  if (!validReview(row) || !Number.isSafeInteger(row.version) || !['PUBLISHED', 'HIDDEN'].includes(row.status)) throw new Error('Dữ liệu đánh giá của bạn chưa hợp lệ.')
  return row
}

export function reviewQuery(filters: ReviewFilters, cursor?: string, limit = 10) {
  const query = new URLSearchParams({ limit: String(limit) })
  for (const [key, value] of Object.entries(filters).sort(([a], [b]) => a.localeCompare(b))) if (value?.trim()) query.set(key, value.trim())
  if (cursor) query.set('cursor', cursor)
  return query.toString()
}
export const reviewTextLength = (text: string) => Array.from(text.trim()).length
export function canWriteWebReview(user?: { status: string; roles: string[] } | null) {
  return Boolean(user?.status === 'ACTIVE' && user.roles.includes('USER') && !user.roles.some(role => ['ADMIN', 'EXPERT', 'CONTENT_EDITOR', 'CONTENT_REVIEWER', 'CONTENT_PUBLISHER'].includes(role)))
}
export function reviewDraftError(rating: number, content: string, reply = false) {
  if (!reply && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return 'Vui lòng chọn từ 1 đến 5 sao.'
  const length = reviewTextLength(content)
  if (length < (reply ? 2 : 10) || length > 1000) return `Nội dung cần từ ${reply ? 2 : 10} đến 1000 ký tự.`
  return ''
}
export function parseReviewSummary(value: unknown): ReviewSummary {
  const row = value as ReviewSummary | undefined
  if (!row || !Number.isSafeInteger(row.total) || row.total < 0 || !row.by_rating) throw new Error('Dữ liệu tổng hợp đánh giá chưa hợp lệ.')
  const counts = ['1', '2', '3', '4', '5'].map(star => row.by_rating[star as keyof ReviewSummary['by_rating']])
  if (counts.some(count => !Number.isSafeInteger(count) || count < 0) || counts.reduce((a, b) => a + b, 0) !== row.total
    || (row.total > 0 && (typeof row.average !== 'number' || !Number.isFinite(row.average) || row.average < 1 || row.average > 5))) throw new Error('Dữ liệu tổng hợp đánh giá chưa hợp lệ.')
  return { total: row.total, by_rating: { ...row.by_rating }, ...(row.total ? { average: row.average } : {}) }
}
export function mergeReviewPage<T extends { id: string }>(previous: T[], next: T[]) {
  const ids = new Set(previous.map(item => item.id))
  return [...previous, ...next.filter(item => !ids.has(item.id) && Boolean(ids.add(item.id)))]
}
