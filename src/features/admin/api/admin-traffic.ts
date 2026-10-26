import { apiClient } from '@/core/api/api-client'

export interface SourceMetricDto {
  source: string
  display_name: string
  visits: number
  signups: number
  purchases: number
  revenue: number
  conversion_rate: number
  traffic_share: number
}

export interface TrafficSummaryResponse {
  from_date: string
  to_date: string
  total_visits: number
  total_signups: number
  total_purchases: number
  total_revenue: number
  overall_conversion_rate: number
  metrics: SourceMetricDto[]
  ga4_property_id: string
  ga4_console_url: string
}

export async function fetchTrafficSummary(from?: string, to?: string): Promise<TrafficSummaryResponse> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return apiClient.request<TrafficSummaryResponse>(`/admin/analytics/traffic-summary${qs}`)
}
