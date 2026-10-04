import type { VideoRoomInfo } from '../api/video-api.ts'

export function roomMessage(state: VideoRoomInfo['state']) {
  switch (state) {
    case 'SCHEDULED': return 'Phòng mở trước giờ hẹn 5 phút. Bạn có thể kiểm tra thiết bị trước khi bắt đầu.'
    case 'UNSCHEDULED': return 'Phòng sẽ sẵn sàng sau khi chuyên gia tiếp nhận và xếp lịch.'
    case 'UNAVAILABLE': return 'Phòng tư vấn trực tuyến chưa sẵn sàng. Vui lòng liên hệ hỗ trợ để được hướng dẫn.'
    case 'ENDED': return 'Buổi tư vấn đã kết thúc hoặc lịch đã bị hủy.'
    default: return 'Kiểm tra camera và micro, sau đó vào phòng khi bạn đã sẵn sàng.'
  }
}
export function remainingLabel(closesAt: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(closesAt) - now) / 1000))
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
export function roomPath(id: string, expert = false) {
  return `/${expert ? 'expert' : 'app'}/consultations/${encodeURIComponent(id)}/call`
}
