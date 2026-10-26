import { apiClient } from '../api/api-client'

export type TrafficSourceType = 'TIKTOK' | 'FACEBOOK' | 'INSTAGRAM' | 'GOOGLE' | 'DIRECT' | 'OTHER'

const SESSION_STORAGE_KEY = 'nutrimom:visitor_session_id'
const ACQUISITION_SOURCE_KEY = 'nutrimom:acquisition_source'
const LAST_TRACKED_KEY = 'nutrimom:last_tracked_path'

interface RecordVisitRequest {
  source: string
  medium?: string
  campaign?: string
  landing_path: string
  referrer?: string
  visitor_session_id: string
}

interface RecordVisitResponse {
  recorded: boolean
  source: string
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function getVisitorSessionId(): string {
  if (typeof window === 'undefined') return 'ssr_session'
  let id = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!id) {
    id = localStorage.getItem(SESSION_STORAGE_KEY)
  }
  if (!id) {
    id = generateSessionId()
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
    localStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

export function detectTrafficSource(): {
  source: TrafficSourceType
  medium?: string
  campaign?: string
  referrer?: string
} {
  if (typeof window === 'undefined') {
    return { source: 'DIRECT' }
  }

  const searchParams = new URLSearchParams(window.location.search)
  const utmSource = (searchParams.get('utm_source') || '').trim().toLowerCase()
  const utmMedium = (searchParams.get('utm_medium') || '').trim() || undefined
  const utmCampaign = (searchParams.get('utm_campaign') || '').trim() || undefined
  const rawReferrer = document.referrer || ''

  // 1. UTM source takes highest priority
  if (utmSource) {
    if (utmSource.includes('tiktok') || utmSource === 'tt') {
      return { source: 'TIKTOK', medium: utmMedium, campaign: utmCampaign, referrer: rawReferrer }
    }
    if (utmSource.includes('facebook') || utmSource === 'fb' || utmSource === 'meta') {
      return { source: 'FACEBOOK', medium: utmMedium, campaign: utmCampaign, referrer: rawReferrer }
    }
    if (utmSource.includes('instagram') || utmSource === 'ig') {
      return { source: 'INSTAGRAM', medium: utmMedium, campaign: utmCampaign, referrer: rawReferrer }
    }
    if (utmSource.includes('google') || utmSource === 'adwords') {
      return { source: 'GOOGLE', medium: utmMedium, campaign: utmCampaign, referrer: rawReferrer }
    }
    return { source: 'OTHER', medium: utmMedium, campaign: utmCampaign, referrer: rawReferrer }
  }

  // 2. HTTP Referrer detection
  if (rawReferrer) {
    try {
      const refUrl = new URL(rawReferrer)
      const host = refUrl.hostname.toLowerCase()

      // Ignore same-origin transitions
      if (host !== window.location.hostname.toLowerCase()) {
        if (host.includes('tiktok.com')) {
          return { source: 'TIKTOK', medium: 'referral', referrer: rawReferrer }
        }
        if (host.includes('facebook.com') || host.includes('fb.com') || host.includes('fb.me') || host.includes('messenger.com')) {
          return { source: 'FACEBOOK', medium: 'referral', referrer: rawReferrer }
        }
        if (host.includes('instagram.com')) {
          return { source: 'INSTAGRAM', medium: 'referral', referrer: rawReferrer }
        }
        if (host.includes('google.com') || host.includes('google.com.vn')) {
          return { source: 'GOOGLE', medium: 'organic', referrer: rawReferrer }
        }
        return { source: 'OTHER', medium: 'referral', referrer: rawReferrer }
      }
    } catch {
      // Ignore parse error
    }
  }

  return { source: 'DIRECT', referrer: rawReferrer }
}

export function getStoredTrafficSource(): string {
  if (typeof window === 'undefined') return 'DIRECT'
  const stored = sessionStorage.getItem(ACQUISITION_SOURCE_KEY) || localStorage.getItem(ACQUISITION_SOURCE_KEY)
  return stored || 'DIRECT'
}

let hasInitialized = false

/**
 * Tracks current visit, attributes acquisition channel, and forwards to GA4 & Backend API.
 */
export async function initTrafficTracker(): Promise<void> {
  if (typeof window === 'undefined') return

  const path = window.location.pathname
  const { source, medium, campaign, referrer } = detectTrafficSource()
  const sessionId = getVisitorSessionId()

  // Store first non-DIRECT touchpoint for user registration attribution
  const existingSource = sessionStorage.getItem(ACQUISITION_SOURCE_KEY) || localStorage.getItem(ACQUISITION_SOURCE_KEY)
  if (!existingSource || (existingSource === 'DIRECT' && source !== 'DIRECT')) {
    sessionStorage.setItem(ACQUISITION_SOURCE_KEY, source)
    localStorage.setItem(ACQUISITION_SOURCE_KEY, source)
  }

  // Don't duplicate API hit for exact same path in the same page execution
  const lastTracked = sessionStorage.getItem(LAST_TRACKED_KEY)
  if (hasInitialized && lastTracked === path) {
    return
  }
  hasInitialized = true
  sessionStorage.setItem(LAST_TRACKED_KEY, path)

  // 1. Send to Backend Live Analytics
  try {
    const payload: RecordVisitRequest = {
      source,
      medium,
      campaign,
      landing_path: path,
      referrer: referrer || undefined,
      visitor_session_id: sessionId,
    }

    await apiClient.request<RecordVisitResponse>('/analytics/traffic/visit', {
      method: 'POST',
      authenticated: false,
      body: JSON.stringify(payload),
    })
  } catch (error) {
    // Non-blocking telemetry
    console.debug('Traffic visit telemetry recorded locally:', error)
  }

  // 2. Forward to GA4 (Google Analytics) if gtag is available
  try {
    const win = window as unknown as { gtag?: (...args: unknown[]) => void }
    if (typeof win.gtag === 'function') {
      win.gtag('event', 'traffic_visit', {
        traffic_source: source,
        traffic_medium: medium || 'direct',
        traffic_campaign: campaign || 'none',
        page_path: path,
      })
    }
  } catch {
    // Non-blocking
  }
}
