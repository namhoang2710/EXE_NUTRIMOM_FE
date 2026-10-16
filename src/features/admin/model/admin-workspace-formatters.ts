export const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
export const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
export const comparison = (current: number, previous: number) => previous === 0 ? 'Chưa có dữ liệu so sánh' : `${((current - previous) / previous * 100).toFixed(1)}% so với kỳ trước`
