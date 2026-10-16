import { CalendarBlank, CreditCard, Info, UserCircle, ChatCircleText } from '@phosphor-icons/react'
import type { NotificationItem } from '@/features/notifications/model/notification-types'
import { adminCategoryLabels } from '../model/admin-notifications'
const icons = { ACCOUNT:UserCircle, PAYMENT:CreditCard, APPOINTMENT:CalendarBlank, SUPPORT:ChatCircleText, GENERAL:Info }
export function adminNotificationLabel(item:NotificationItem) { return item.category ? adminCategoryLabels[item.category] : 'Thông báo' }
export function adminNotificationIcon(item:NotificationItem) { const Icon = item.category ? icons[item.category] : Info; return <Icon size={20} /> }
