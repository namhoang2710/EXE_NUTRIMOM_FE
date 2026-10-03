import { VideoCamera } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { roomPath } from '../model/video-room'

export function VideoRoomLink({ id, expert = false, className = 'consultation-secondary-button' }: { id: string; expert?: boolean; className?: string }) {
  return <Link to={roomPath(id, expert)} className={className}><VideoCamera size={18} aria-hidden="true" />Phòng tư vấn</Link>
}
