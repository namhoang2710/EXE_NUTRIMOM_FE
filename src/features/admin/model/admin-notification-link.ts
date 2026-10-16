import { uuidPattern, validOrderCode } from './admin-workspace-query.ts'
export function adaptAdminNotificationLink(deepLink: string | undefined, authorized: boolean) {
  if (!authorized) return { message: 'Bạn không đủ quyền truy cập Admin.' }
  if (!deepLink) return {}
  const match = deepLink.match(/^nutrimom:\/\/admin\/(users|payment-orders|contact-requests|appointments)\/([^/?#]+)$/)
  if (!match || !(match[1] === 'payment-orders' ? validOrderCode(match[2]) : uuidPattern.test(match[2]))) return { message: 'Liên kết thông báo chưa được hỗ trợ hoặc không hợp lệ.' }
  const [ ,kind,id ] = match
  if (kind === 'contact-requests') return { path: `/admin/support/${id}` }
  const query = new URLSearchParams({ [kind === 'users' ? 'userId' : kind === 'payment-orders' ? 'orderCode' : 'requestId']: id })
  return { path: `/admin/${kind === 'users' ? 'users' : kind === 'payment-orders' ? 'revenue' : 'appointments'}?${query}` }
}
