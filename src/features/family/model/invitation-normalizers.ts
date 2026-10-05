import type { FamilyInvitation, FamilyInvitationPreview, FamilyInvitationStatus, FamilyInvitationSummary, FamilyScope, InvitationDeliveryStatus } from './family-types'
import { logDiagnostic } from '../../../core/diagnostics/logger.ts'

type Json = Record<string, unknown>
const statuses = new Set<FamilyInvitationStatus>(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'])
const deliveries = new Set<InvitationDeliveryStatus>(['SENT', 'FAILED', 'SKIPPED'])
const scopes = new Set<FamilyScope>(['PREGNANCY_SUMMARY', 'FAMILY_TASKS', 'SHARED_CALENDAR', 'ALERTS', 'ACTIVITY_FEED', 'MEDICAL_RECORDS'])
const record = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Json : undefined
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value : undefined
const date = (value: unknown) => { const result = text(value); return result && !Number.isNaN(Date.parse(result)) ? result : undefined }
const scopeList = (value: unknown) => Array.isArray(value) ? value.filter((scope): scope is FamilyScope => scopes.has(scope as FamilyScope)) : undefined

export class FamilyInvitationContractError extends Error {
  constructor(reason: string) { super(`Dữ liệu lời mời từ máy chủ không hợp lệ (${reason}).`); this.name = 'FamilyInvitationContractError'; logDiagnostic({ level: 'error', category: 'family-invitation', event: 'contract_normalization_failed', reason }) }
}

export function normalizeCreatedInvitation(value: unknown): FamilyInvitation {
  const item = record(value); const status = statuses.has(item?.status as FamilyInvitationStatus) ? item?.status as FamilyInvitationStatus : undefined
  const delivery = deliveries.has(item?.delivery_status as InvitationDeliveryStatus) ? item?.delivery_status as InvitationDeliveryStatus : undefined
  const normalizedScopes = scopeList(item?.scopes); const phone = text(item?.invited_phone); const email = text(item?.invited_email)
  const result = { id: text(item?.id), family_group_id: text(item?.family_group_id), invited_phone: phone, invited_email: email, token: text(item?.token), invite_url: text(item?.invite_url), relationship: text(item?.relationship), scopes: normalizedScopes, status, delivery_status: delivery, sent_at: date(item?.sent_at), expires_at: date(item?.expires_at), created_at: date(item?.created_at) }
  if (!result.id || !result.family_group_id || Boolean(phone) === Boolean(email) || !result.token || !result.invite_url || !result.relationship || !result.scopes || !result.status || !result.delivery_status || !result.expires_at || !result.created_at) throw new FamilyInvitationContractError('response tạo lời mời thiếu trường bắt buộc')
  return result as FamilyInvitation
}

export function normalizeInvitationPreview(value: unknown): FamilyInvitationPreview {
  const item = record(value); const status = statuses.has(item?.status as FamilyInvitationStatus) ? item?.status as FamilyInvitationStatus : undefined
  const targetType = item?.target_type === 'EMAIL' || item?.target_type === 'PHONE' ? item.target_type : undefined
  const normalizedScopes = scopeList(item?.scopes)
  const scopeLabels = Array.isArray(item?.scope_labels) ? item.scope_labels.filter((label): label is string => typeof label === 'string') : undefined
  const result = { inviter_display_name: text(item?.inviter_display_name), relationship: text(item?.relationship), relationship_label: text(item?.relationship_label), scopes: normalizedScopes, scope_labels: scopeLabels, target_type: targetType, masked_target: text(item?.masked_target), expires_at: date(item?.expires_at), status }
  if (Object.values(result).some((field) => field === undefined)) throw new FamilyInvitationContractError('preview thiếu trường bắt buộc')
  return result as FamilyInvitationPreview
}

export function normalizeInvitationList(value: unknown): FamilyInvitationSummary[] {
  if (!Array.isArray(value)) throw new FamilyInvitationContractError('danh sách không phải mảng')
  return value.map((entry) => {
    const item = record(entry); const status = statuses.has(item?.status as FamilyInvitationStatus) ? item?.status as FamilyInvitationStatus : undefined
    const targetType = item?.target_type === 'EMAIL' || item?.target_type === 'PHONE' ? item.target_type : undefined
    const normalizedScopes = scopeList(item?.scopes); const delivery = deliveries.has(item?.delivery_status as InvitationDeliveryStatus) ? item?.delivery_status as InvitationDeliveryStatus : undefined
    const result = { id: text(item?.id), target_type: targetType, masked_target: text(item?.masked_target), relationship: text(item?.relationship), scopes: normalizedScopes, status, delivery_status: delivery, sent_at: date(item?.sent_at), expires_at: date(item?.expires_at), created_at: date(item?.created_at) }
    if (!result.id || !result.target_type || !result.masked_target || !result.relationship || !result.scopes || !result.status || !result.expires_at || !result.created_at) throw new FamilyInvitationContractError('item thiếu trường bắt buộc')
    return result as FamilyInvitationSummary
  })
}

function maskInvitationTarget(value: string, type: 'EMAIL' | 'PHONE') {
  if (type === 'EMAIL') {
    const separator = value.lastIndexOf('@')
    const local = separator > 0 ? value.slice(0, separator) : value
    const domain = separator > 0 ? value.slice(separator + 1) : ''
    return `${local.charAt(0) || '*'}***${domain ? `@${domain}` : ''}`
  }
  const digits = value.replace(/\D/g, '')
  return `***${digits.slice(-4)}`
}

export function createdInvitationSummary(invitation: FamilyInvitation): FamilyInvitationSummary {
  const targetType = invitation.invited_email ? 'EMAIL' : 'PHONE'
  const target = invitation.invited_email || invitation.invited_phone || ''
  return {
    id: invitation.id,
    target_type: targetType,
    masked_target: maskInvitationTarget(target, targetType),
    relationship: invitation.relationship,
    scopes: invitation.scopes,
    status: invitation.status,
    delivery_status: invitation.delivery_status,
    sent_at: invitation.sent_at,
    expires_at: invitation.expires_at,
    created_at: invitation.created_at,
  }
}
