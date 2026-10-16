import type { RedesignedDashboard } from './admin-dashboard-overview.ts'

export type MetricTrend = 'up' | 'down' | 'flat' | 'unknown'
export interface MetricPoint { date: string; value: number | null }
export function metricTrend(current: number, previous: number): MetricTrend {
  return current > previous ? 'up' : current < previous ? 'down' : 'flat'
}
/** Uses the complete hourly aggregate, never the six-row schedule preview. */
export function bookingSparkline(data: RedesignedDashboard | null): MetricPoint[] | null {
  const rows = data?.today_schedule.hourly_bookings
  if (!data?.overview || !rows || rows.length !== 24) return null
  if (rows.some((row, i) => row.hour !== `${String(i).padStart(2, '0')}:00` || !Number.isSafeInteger(row.count) || row.count < 0)) return null
  if (rows.reduce((sum, row) => sum + row.count, 0) !== data.overview.today_booked_appointments) return null
  return rows.map(row => ({ date: row.hour, value: row.count }))
}
