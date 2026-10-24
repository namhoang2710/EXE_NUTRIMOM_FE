import type { MomDashboard } from '@/types/domain'
import { hasRunningPregnancyAge } from '../../maternity/model/pregnancy-context.ts'

export function dashboardGreeting(dashboard?: MomDashboard | null) {
  const profile = dashboard?.profile_summary
  const name = profile?.display_name
  if (hasRunningPregnancyAge(dashboard?.pregnancy_summary)) return { title: `Chào mẹ ${name || 'bạn'}`, subtitle: `Hiện tại bé đã được ${dashboard.pregnancy_summary.gestational_week} tuần ${dashboard.pregnancy_summary.gestational_day} ngày.` }
  const salutation = profile?.salutation?.trim()
  const greeting = salutation ? (salutation.toLocaleLowerCase('vi-VN').startsWith('chào') ? salutation : `Chào ${salutation.toLocaleLowerCase('vi-VN')}`) : 'Chào bạn'
  return { title: name ? `${greeting}, ${name}` : greeting, subtitle: 'Chúc chị một ngày mới an lành.' }
}
