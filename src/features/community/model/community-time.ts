import { formatDistanceStrict } from 'date-fns'
import { vi } from 'date-fns/locale'
import { formatVietnamDate } from '../../../core/date-time/vietnam.ts'

/** "5 phút trước", "2 ngày trước"... ; quá 7 ngày thì hiện ngày cụ thể. */
export function relativeTime(iso: string | null | undefined, now = new Date()) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  if (now.getTime() - date.getTime() > 7 * 86_400_000) {
    return formatVietnamDate(date)
  }
  if (now.getTime() - date.getTime() < 60_000) return 'Vừa xong'
  return `${formatDistanceStrict(date, now, { locale: vi })} trước`
}

export function initial(name: string) {
  return (name.trim().charAt(0) || 'M').toUpperCase()
}
