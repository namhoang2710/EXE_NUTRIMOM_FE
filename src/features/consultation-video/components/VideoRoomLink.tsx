import { MdVideoCall } from 'react-icons/md'
import { Link } from 'react-router-dom'
import { roomPath } from '../model/video-room'

export function VideoRoomLink({ id, expert = false, className = 'consultation-secondary-button' }: { id: string; expert?: boolean; className?: string }) {
  return <Link to={roomPath(id, expert)} className={className}><MdVideoCall size={21} aria-hidden="true" />Phòng tư vấn</Link>
}
