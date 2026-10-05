export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error'
export type DiagnosticCategory = 'api' | 'calendar' | 'shared-calendar' | 'notification' | 'family-invitation' | 'family-scope'

export interface DiagnosticEvent {
  timestamp: string
  level: DiagnosticLevel
  category: DiagnosticCategory
  event: string
  method?: string
  route_template?: string
  status?: number
  error_code?: string
  client_request_id?: string
  server_request_id?: string
  duration_ms?: number
  retry_attempt?: number
  reason?: string
}

const MAX_EVENTS = 200
const events: DiagnosticEvent[] = []
const sensitiveKey = /(authorization|password|otp|token|invite_url|email|phone|body|note)/i
const bearer = /bearer\s+[a-z0-9._~+/=-]+/gi
const email = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const phone = /(?:\+?84|0)(?:[ .()-]*\d){8,10}/g
const invitationLink = /nutrimom:\/\/family\/invitations\?token=[^\s&#]+/gi

function redactText(value: string) {
  return value
    .replace(bearer, 'Bearer [REDACTED]')
    .replace(email, '[REDACTED_EMAIL]')
    .replace(phone, '[REDACTED_PHONE]')
    .replace(invitationLink, 'nutrimom://family/invitations?token=[REDACTED]')
    .replace(/([?&]token=)[^&#\s]+/gi, '$1[REDACTED]')
}

export function redactDiagnosticValue(value: unknown): unknown {
  if (typeof value === 'string') return redactText(value)
  if (Array.isArray(value)) return value.map(redactDiagnosticValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sensitiveKey.test(key) ? '[REDACTED]' : redactDiagnosticValue(item)]))
  }
  return value
}

function isDevelopment() {
  const vite = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env
  if (typeof vite?.DEV === 'boolean') return vite.DEV
  const runtime = globalThis as typeof globalThis & { process?: { env?: { NODE_ENV?: string } } }
  return runtime.process?.env?.NODE_ENV !== 'production'
}

function shouldWriteConsole() {
  return Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV)
}

export function logDiagnostic(input: Omit<DiagnosticEvent, 'timestamp'> & { timestamp?: string }) {
  const safe = redactDiagnosticValue({ ...input, timestamp: input.timestamp || new Date().toISOString() }) as DiagnosticEvent
  if (!isDevelopment() && safe.level !== 'warn' && safe.level !== 'error') return safe
  events.push(safe)
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
  if (shouldWriteConsole() && typeof console !== 'undefined') {
    const method = safe.level === 'debug' ? 'debug' : safe.level === 'info' ? 'info' : safe.level === 'warn' ? 'warn' : 'error'
    console[method]('[NutriMom diagnostic]', safe)
  }
  return safe
}

export function getDiagnosticEvents() { return events.map((event) => ({ ...event })) }
export function clearDiagnosticEvents() { events.length = 0 }

export function diagnosticSummary(feature: DiagnosticCategory, event: string, reason: unknown) {
  const error = reason as { code?: unknown; requestId?: unknown }
  return redactText([
    `feature=${feature}`,
    `event=${event}`,
    `time=${new Date().toISOString()}`,
    `error_code=${typeof error?.code === 'string' ? error.code : 'UNKNOWN'}`,
    `request_id=${typeof error?.requestId === 'string' ? error.requestId : 'unavailable'}`,
  ].join('\n'))
}

export async function copyDiagnosticSummary(feature: DiagnosticCategory, event: string, reason: unknown) {
  await navigator.clipboard.writeText(diagnosticSummary(feature, event, reason))
}
