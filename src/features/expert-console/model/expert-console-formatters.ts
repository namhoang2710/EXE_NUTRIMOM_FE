export function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed)
}

export function formatDateTime(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parsed)
}

export function formatTime(value: string) {
  return value.slice(0, 5)
}

export function todayIso() {
  const today = new Date()
  const offset = today.getTimezoneOffset() * 60_000
  return new Date(today.getTime() - offset).toISOString().slice(0, 10)
}

