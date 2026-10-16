const dateFormat = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: '2-digit' })
const timeFormat = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export function formatAdminClock(now: Date) { return `Hôm nay ${dateFormat.format(now)} | ${timeFormat.format(now)}` }
export function adminGreeting(now: Date) {
  const hour = Number(timeFormat.formatToParts(now).find(part => part.type === 'hour')?.value)
  return hour >= 5 && hour < 12 ? 'Good morning, Sếp' : hour >= 12 && hour < 18 ? 'Good afternoon, Sếp' : 'Good evening, Sếp'
}
export function formatAdminGreeting(now: Date) { return `${adminGreeting(now)} | ${formatAdminClock(now)}` }
