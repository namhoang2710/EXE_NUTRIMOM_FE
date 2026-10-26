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

const DEFAULT_CHANNELS: { source: string; display_name: string }[] = [
  { source: 'TIKTOK', display_name: 'TikTok' },
  { source: 'FACEBOOK', display_name: 'Facebook' },
  { source: 'INSTAGRAM', display_name: 'Instagram' },
  { source: 'GOOGLE', display_name: 'Google Ads / Tìm kiếm' },
  { source: 'DIRECT', display_name: 'Truy cập trực tiếp' },
  { source: 'OTHER', display_name: 'Kênh khác' },
]

export async function fetchTrafficSummary(from?: string, to?: string): Promise<TrafficSummaryResponse> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString() ? `?${params.toString()}` : ''

  const res = await apiClient.request<any>(`/admin/analytics/traffic-summary${qs}`)

  // Backend can return by_source or metrics
  const rawList: any[] = res?.by_source || res?.metrics || []
  const rawMap = new Map<string, any>()
  for (const item of rawList) {
    if (item && item.source) {
      rawMap.set(item.source.toUpperCase(), item)
    }
  }

  // Ensure all standard channels exist in metrics
  const metrics: SourceMetricDto[] = DEFAULT_CHANNELS.map((ch) => {
    const found = rawMap.get(ch.source)
    if (found) {
      return {
        source: ch.source,
        display_name: found.label || found.display_name || ch.display_name,
        visits: Number(found.visits) || 0,
        signups: Number(found.signups) || 0,
        purchases: Number(found.purchases) || 0,
        revenue: Number(found.revenue) || 0,
        conversion_rate: Number(found.conversion_rate) || 0,
        traffic_share: Number(found.percentage_of_traffic ?? found.traffic_share ?? 0),
      }
    }
    return {
      source: ch.source,
      display_name: ch.display_name,
      visits: 0,
      signups: 0,
      purchases: 0,
      revenue: 0,
      conversion_rate: 0,
      traffic_share: 0,
    }
  })

  // Append any extra unknown channels
  for (const [key, item] of rawMap.entries()) {
    if (!DEFAULT_CHANNELS.some((ch) => ch.source === key)) {
      metrics.push({
        source: key,
        display_name: item.label || item.display_name || key,
        visits: Number(item.visits) || 0,
        signups: Number(item.signups) || 0,
        purchases: Number(item.purchases) || 0,
        revenue: Number(item.revenue) || 0,
        conversion_rate: Number(item.conversion_rate) || 0,
        traffic_share: Number(item.percentage_of_traffic ?? item.traffic_share ?? 0),
      })
    }
  }

  return {
    from_date: res?.date_from || res?.from_date || '',
    to_date: res?.date_to || res?.to_date || '',
    total_visits: Number(res?.total_visits) || 0,
    total_signups: Number(res?.total_signups) || 0,
    total_purchases: Number(res?.total_purchases) || 0,
    total_revenue: Number(res?.total_revenue) || 0,
    overall_conversion_rate: Number(res?.overall_conversion_rate) || 0,
    metrics,
    ga4_property_id: res?.ga4_property_id || 'G-4KC1688D38',
    ga4_console_url: res?.ga4_console_url || 'https://analytics.google.com/',
  }
}

