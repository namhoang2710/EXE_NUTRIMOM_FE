import type { VideoRoomInfo } from '../api/video-api.ts'

export type EffectiveRoomState = VideoRoomInfo['state']

export type CallTimeWarning = {
  minutes: 10 | 5 | 1
  message: string
  tone: 'notice' | 'warning' | 'urgent'
}

const CALL_TIME_WARNINGS: readonly CallTimeWarning[] = [
  { minutes: 1, message: 'Buổi tư vấn sắp kết thúc trong 1 phút.', tone: 'urgent' },
  { minutes: 5, message: 'Buổi tư vấn còn 5 phút. Vui lòng hoàn tất các nội dung quan trọng.', tone: 'warning' },
  { minutes: 10, message: 'Buổi tư vấn còn 10 phút.', tone: 'notice' },
]

export function roomMessage(state: EffectiveRoomState) {
  switch (state) {
    case 'SCHEDULED': return 'Phòng mở trước giờ hẹn 5 phút. Bạn có thể kiểm tra thiết bị trước khi bắt đầu.'
    case 'UNSCHEDULED': return 'Phòng sẽ sẵn sàng sau khi chuyên gia tiếp nhận và xếp lịch.'
    case 'UNAVAILABLE': return 'Phòng tư vấn trực tuyến chưa sẵn sàng. Vui lòng liên hệ hỗ trợ để được hướng dẫn.'
    case 'ENDED': return 'Buổi tư vấn đã kết thúc hoặc lịch đã bị hủy.'
    default: return 'Kiểm tra camera và micro, sau đó vào phòng khi bạn đã sẵn sàng.'
  }
}

export function effectiveRoomState(info: VideoRoomInfo, now: number): EffectiveRoomState {
  if (info.closes_at && now >= Date.parse(info.closes_at)) return 'ENDED'
  if (info.state === 'SCHEDULED' && info.opens_at && now >= Date.parse(info.opens_at)) return 'READY'
  return info.state
}

export function nextRoomBoundary(info: VideoRoomInfo, now: number) {
  const opensAt = info.state === 'SCHEDULED' && info.opens_at ? Date.parse(info.opens_at) : Number.NaN
  if (Number.isFinite(opensAt) && opensAt > now) return { type: 'open' as const, at: opensAt }
  const closesAt = info.closes_at ? Date.parse(info.closes_at) : Number.NaN
  if (Number.isFinite(closesAt) && closesAt > now) return { type: 'close' as const, at: closesAt }
  return null
}

export function shouldRefreshOnForeground(lastFetchedAt: number, now: number, staleAfterMs = 30_000) {
  return now - lastFetchedAt > staleAfterMs
}

export function isCompletedConsultation(info: VideoRoomInfo) {
  return info.consultation_status === 'COMPLETED'
}

export function hasReachedRoomClose(info: VideoRoomInfo, now: number) {
  const closesAt = info.closes_at ? Date.parse(info.closes_at) : Number.NaN
  return Number.isFinite(closesAt) && now >= closesAt
}

export function canOfferPostCallReview(info: VideoRoomInfo, now: number) {
  return isCompletedConsultation(info)
    || (info.consultation_status === 'PENDING_CONSULTATION' && hasReachedRoomClose(info, now))
}

export function nextCallTimeWarning(remainingMs: number, shown: ReadonlySet<number>) {
  if (remainingMs <= 0) return null
  const warning = CALL_TIME_WARNINGS.find(({ minutes }) => remainingMs <= minutes * 60_000)
  return warning && !shown.has(warning.minutes) ? warning : null
}

export function callCapabilityError(secureContext: boolean, e2eeSupported: boolean) {
  if (!secureContext) return 'Hãy mở NutriMom bằng HTTPS để sử dụng camera và micro.'
  if (!e2eeSupported) return 'Trình duyệt chưa hỗ trợ cuộc gọi mã hóa đầu cuối. Hãy dùng Chrome hoặc Edge phiên bản mới nhất.'
  return null
}

export function remainingLabel(closesAt: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(closesAt) - now) / 1000))
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

export function roomPath(id: string, expert = false) {
  return `/${expert ? 'expert' : 'app'}/consultations/${encodeURIComponent(id)}/call`
}

export function postCallPath(requestId: string, expert: boolean, review: boolean) {
  if (expert) return '/expert?section=schedule'
  const query = new URLSearchParams({ request: requestId })
  if (review) query.set('review', '1')
  return `/app/consultations/history?${query.toString()}`
}
