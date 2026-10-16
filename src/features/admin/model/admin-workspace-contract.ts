import { consultationStatuses, paymentStatuses, plans, realDate, specialties, uuidPattern, validOrderCode } from './admin-workspace-query.ts'

export interface AdminPage<T> { items: T[]; page: number; page_size: number; total_items: number; total_pages: number }
export interface AppointmentDto {
  id: string; user_id: string; user_display_name: string | null; expert_user_id: string | null; expert_name: string | null;
  specialty: typeof specialties[number]; assignment_type: 'DIRECT' | 'RANDOM'; status: typeof consultationStatuses[number];
  slot: { id: string; slot_date: string; start_time: string; end_time: string } | null;
  created_at: string; completed_at: string | null; waiting_hours: number | null; needs_attention: boolean;
  attention_reason: 'WAITING_EXPERT' | 'ACCEPTANCE_OVERDUE' | 'PAST_END_UNCOMPLETED' | null;
  preferred_date?:string|null;acceptance_deadline_at?:string|null;accepted_at?:string|null;acceptance_policy_version?:number|null;server_time?:string;
  updated_at?: string; review?: { rating: number; comment: string | null } | null; review_rating?: number | null;
}
export interface PaymentOrderDto {
  id: string; order_code: string; user_id: string; user_display_name: string | null; plan_tier: typeof plans[number];
  plan_name: string; amount: number; currency: 'VND'; source: 'REAL' | 'DEMO' | 'LEGACY_UNKNOWN'; status: typeof paymentStatuses[number];
  created_at: string; paid_at: string | null; updated_at?: string; description?: string | null;
}
export interface SubscriptionDto {
  id: string; user_id: string; user_display_name: string | null; plan_tier: 'PLAN_99K' | 'PLAN_399K'; status: string;
  effective_status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'NOT_STARTED'; start_date: string; end_date: string; days_remaining: number;
}
export interface Period { from_date: string; to_date: string; previous_from_date: string; previous_to_date: string }
export interface AttentionItem {
  id: string; kind: 'CONSULTATION_PAST_END' | 'EXPERT_WAITING' | 'ACCEPTANCE_OVERDUE' | 'SUPPORT_PENDING'; source_id: string; display_name: string | null;
  title: string; occurred_at: string; age_hours: number; overdue: boolean;
}
export interface DashboardDto {
  snapshot_at: string; timezone: 'Asia/Ho_Chi_Minh'; period: Period;
  kpis: { support_pending: number; support_overdue: number; expert_pending: number; expert_overdue: number; today_total: number; today_completed: number; today_pending: number; real_collected_amount: number; real_paid_orders: number; previous_real_collected_amount: number };
  attention: { totals: { past_end_uncompleted: number; waiting_expert: number; support_pending: number }; items: AttentionItem[] };
  today_schedule: { total_items: number; items: AppointmentDto[]; hourly_bookings?: { hour: string; count: number }[] };
  series: { collections: { date: string; amount: number; paid_orders: number; previous_date: string; previous_amount: number }[]; registrations: { date: string; count: number; previous_date: string; previous_count: number }[] };
  subscription_snapshot: { as_of: string; plan_99k_users: number; plan_399k_users: number };
  recent_activity: { id: string; kind: 'USER_REGISTERED' | 'PAYMENT_PAID' | 'CONSULTATION_COMPLETED' | 'SUPPORT_COMPLETED'; source_id: string; title: string; occurred_at: string; order_code: string | null }[];
}
export interface RevenueSummaryDto {
  snapshot_at: string; timezone: 'Asia/Ho_Chi_Minh'; period: Period | null; source: 'REAL' | 'DEMO' | 'LEGACY_UNKNOWN' | 'ALL'; range?: 'ALL_TIME' | 'PERIOD';
  summary: { collected_amount: number; paid_orders: number; average_paid_amount: number; previous_collected_amount: number; legacy_unknown_orders: number };
  daily_series: { date: string; amount: number; paid_orders: number }[]; by_plan: { plan_tier: typeof plans[number]; amount: number; paid_orders: number }[];
}
export interface UserCohortDto { user_id: string; display_name: string | null; created_at: string; account_status: string; current_plan_tier: typeof plans[number]; subscription_end_date: string | null }
export interface ReportDto extends AdminPage<AppointmentDto | PaymentOrderDto | UserCohortDto> {
  type: 'OPERATIONS' | 'USERS_SUBSCRIPTIONS' | 'REVENUE'; generated_at: string; timezone: 'Asia/Ho_Chi_Minh'; period: Period;
  summary: Record<string, number | string>;
}
export class AdminContractError extends Error {
  constructor(field: string) { super(`Dữ liệu Admin không đúng contract tại ${field}. Vui lòng thử lại hoặc báo nhóm backend.`); this.name = 'AdminContractError' }
}
export function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AdminContractError(field)
  return value as Record<string, unknown>
}
function text(value: unknown, field: string) { if (typeof value !== 'string') throw new AdminContractError(field); return value }
function id(value: unknown, field: string) { if (!uuidPattern.test(text(value, field))) throw new AdminContractError(field) }
function nullableText(value: unknown, field: string) { if (value != null) text(value, field) }
function enumeration(value: unknown, values: readonly string[], field: string) { if (!values.includes(text(value, field))) throw new AdminContractError(field) }
export function count(value: unknown, field: string) { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new AdminContractError(field); return value }
function decimal(value: unknown, field: string) { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) throw new AdminContractError(field) }
function date(value: unknown, field: string) { if (!realDate(text(value, field))) throw new AdminContractError(field) }
function timestamp(value: unknown, field: string) { if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d.*(?:Z|[+-]\d\d:\d\d)$/.test(text(value, field)) || !Number.isFinite(Date.parse(value as string)) || !realDate((value as string).slice(0, 10))) throw new AdminContractError(field) }
function bool(value: unknown, field: string) { if (typeof value !== 'boolean') throw new AdminContractError(field) }
function array(value: unknown, field: string, max = Number.MAX_SAFE_INTEGER): unknown[] { if (!Array.isArray(value) || value.length > max) throw new AdminContractError(field); return value }
function numbers(record: Record<string, unknown>, keys: string[], field: string) { for (const key of keys) count(record[key], `${field}.${key}`) }
function validatePeriod(value: unknown) {
  const p = object(value, 'period'); for (const key of ['from_date', 'to_date', 'previous_from_date', 'previous_to_date']) date(p[key], `period.${key}`)
  const days = (Date.parse(p.to_date as string) - Date.parse(p.from_date as string)) / 86_400_000 + 1
  if (days < 1 || days > 366 || (Date.parse(p.previous_to_date as string) - Date.parse(p.previous_from_date as string)) / 86_400_000 + 1 !== days || Date.parse(p.previous_to_date as string) + 86_400_000 !== Date.parse(p.from_date as string)) throw new AdminContractError('period')
}
function meta(record: Record<string, unknown>, stamp: string) { timestamp(record[stamp], stamp); enumeration(record.timezone, ['Asia/Ho_Chi_Minh'], 'timezone'); validatePeriod(record.period) }
export function mapAdminPage<T>(payload: unknown, mapper: (value: unknown) => T): AdminPage<T> {
  const p = object(payload, 'page'); numbers(p, ['page', 'page_size', 'total_items', 'total_pages'], 'page')
  if ((p.page as number) < 1 || (p.page_size as number) < 1 || (p.page_size as number) > 100 || p.total_pages !== Math.ceil((p.total_items as number) / (p.page_size as number))) throw new AdminContractError('pagination')
  const items = array(p.items, 'items', p.page_size as number).map(mapper)
  if (items.length > (p.total_items as number)) throw new AdminContractError('items.total')
  return { items, page: p.page as number, page_size: p.page_size as number, total_items: p.total_items as number, total_pages: p.total_pages as number }
}
export function mapAppointment(payload: unknown): AppointmentDto {
  const p = object(payload, 'appointment')
  for (const key of ['id', 'user_id']) id(p[key], `appointment.${key}`)
  if (p.expert_user_id != null) id(p.expert_user_id, 'expert_user_id')
  for (const key of ['user_display_name', 'expert_name']) nullableText(p[key], key)
  enumeration(p.status, consultationStatuses, 'appointment.status'); enumeration(p.specialty, specialties, 'specialty'); enumeration(p.assignment_type, ['DIRECT', 'RANDOM'], 'assignment_type')
  timestamp(p.created_at, 'created_at'); if (p.completed_at != null) timestamp(p.completed_at, 'completed_at')
    if (p.preferred_date != null) date(p.preferred_date, 'preferred_date')
    for (const key of ['acceptance_deadline_at', 'accepted_at', 'server_time']) if (p[key] != null) timestamp(p[key], key)
    if (p.acceptance_policy_version != null) count(p.acceptance_policy_version, 'acceptance_policy_version')
  bool(p.needs_attention, 'needs_attention')
  if (p.attention_reason != null) enumeration(p.attention_reason, ['WAITING_EXPERT','ACCEPTANCE_OVERDUE','PAST_END_UNCOMPLETED'], 'attention_reason')
  if (p.waiting_hours != null) { decimal(p.waiting_hours, 'waiting_hours'); if (p.status !== 'PENDING_EXPERT') throw new AdminContractError('waiting_hours.status') }
  if (p.slot != null) {
    const s = object(p.slot, 'slot'); id(s.id, 'slot.id'); date(s.slot_date, 'slot_date')
    for (const key of ['start_time', 'end_time']) if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(text(s[key], key))) throw new AdminContractError(key)
    if ((s.start_time as string) >= (s.end_time as string)) throw new AdminContractError('slot.time')
  }
  if (p.updated_at !== undefined) timestamp(p.updated_at, 'updated_at')
  if (p.review != null) { const r = object(p.review, 'review'); const rating = count(r.rating, 'review.rating'); if (rating < 1 || rating > 5) throw new AdminContractError('review.rating'); nullableText(r.comment, 'review.comment') }
  return p as unknown as AppointmentDto
}
export function mapPayment(payload: unknown): PaymentOrderDto {
  const p = object(payload, 'payment'); id(p.id, 'payment.id'); id(p.user_id, 'user_id')
  if (!validOrderCode(text(p.order_code, 'order_code'))) throw new AdminContractError('order_code')
  count(p.amount, 'amount'); enumeration(p.currency, ['VND'], 'currency'); enumeration(p.status, paymentStatuses, 'payment.status')
  enumeration(p.source, ['REAL', 'DEMO', 'LEGACY_UNKNOWN'], 'source'); enumeration(p.plan_tier, plans, 'plan_tier'); text(p.plan_name, 'plan_name'); nullableText(p.user_display_name, 'user_display_name')
  timestamp(p.created_at, 'created_at'); if (p.paid_at != null) timestamp(p.paid_at, 'paid_at'); if (p.updated_at !== undefined) timestamp(p.updated_at, 'updated_at'); nullableText(p.description, 'description')
  return p as unknown as PaymentOrderDto
}
export function mapSubscription(payload: unknown): SubscriptionDto {
  const p = object(payload, 'subscription'); id(p.id, 'subscription.id'); id(p.user_id, 'user_id'); nullableText(p.user_display_name, 'user_display_name')
  enumeration(p.plan_tier, ['PLAN_99K', 'PLAN_399K'], 'plan_tier'); enumeration(p.status, ['ACTIVE', 'EXPIRED', 'CANCELLED', 'NOT_STARTED'], 'subscription.status')
  enumeration(p.effective_status, ['ACTIVE', 'EXPIRED', 'CANCELLED', 'NOT_STARTED'], 'effective_status')
  timestamp(p.start_date, 'start_date'); timestamp(p.end_date, 'end_date'); count(p.days_remaining, 'days_remaining')
  if (Date.parse(p.end_date as string) <= Date.parse(p.start_date as string)) throw new AdminContractError('subscription.dates')
  return p as unknown as SubscriptionDto
}
export function mapDashboard(payload: unknown): DashboardDto {
  const p = object(payload, 'dashboard'); meta(p, 'snapshot_at')
  const k = object(p.kpis, 'kpis'); numbers(k, ['support_pending', 'support_overdue', 'expert_pending', 'expert_overdue', 'today_total', 'today_completed', 'today_pending', 'real_collected_amount', 'real_paid_orders', 'previous_real_collected_amount'], 'kpis')
  if ((k.support_overdue as number) > (k.support_pending as number) || (k.expert_overdue as number) > (k.expert_pending as number) || (k.today_completed as number) + (k.today_pending as number) > (k.today_total as number)) throw new AdminContractError('kpis.totals')
  const a = object(p.attention, 'attention'); numbers(object(a.totals, 'attention.totals'), ['past_end_uncompleted', 'waiting_expert', 'support_pending'], 'attention.totals')
  for (const item of array(a.items, 'attention.items', 6)) {
    const row = object(item, 'attention.item'); text(row.id, 'attention.id'); id(row.source_id, 'source_id'); enumeration(row.kind, ['CONSULTATION_PAST_END','EXPERT_WAITING','ACCEPTANCE_OVERDUE','SUPPORT_PENDING'], 'attention.kind'); text(row.title, 'title'); nullableText(row.display_name, 'display_name'); timestamp(row.occurred_at, 'occurred_at'); decimal(row.age_hours, 'age_hours'); bool(row.overdue, 'overdue')
  }
  const t = object(p.today_schedule, 'today_schedule'); count(t.total_items, 'today_schedule.total_items'); array(t.items, 'today_schedule.items', 6).forEach(mapAppointment)
  const s = object(p.series, 'series')
  for (const key of ['collections', 'registrations']) {
    for (const item of array(s[key], `series.${key}`, 366)) { const r = object(item, key); date(r.date, 'series.date'); date(r.previous_date, 'previous_date'); numbers(r, key === 'collections' ? ['amount', 'paid_orders', 'previous_amount'] : ['count', 'previous_count'], key) }
  }
  const sub = object(p.subscription_snapshot, 'subscription_snapshot'); timestamp(sub.as_of, 'as_of'); numbers(sub, ['plan_99k_users', 'plan_399k_users'], 'subscription_snapshot')
  for (const item of array(p.recent_activity, 'recent_activity', 8)) {
    const r = object(item, 'activity'); text(r.id, 'activity.id'); id(r.source_id, 'activity.source_id'); text(r.title, 'title'); timestamp(r.occurred_at, 'occurred_at'); enumeration(r.kind, ['USER_REGISTERED', 'PAYMENT_PAID', 'CONSULTATION_COMPLETED', 'SUPPORT_COMPLETED'], 'activity.kind')
    if (r.kind === 'PAYMENT_PAID' ? !validOrderCode(text(r.order_code, 'activity.order_code')) : r.order_code != null) throw new AdminContractError('activity.order_code')
  }
  return p as unknown as DashboardDto
}
export function mapRevenueSummary(payload: unknown, allTime = false): RevenueSummaryDto {
  const p = object(payload, 'revenue')
  if (allTime) { timestamp(p.snapshot_at, 'snapshot_at'); enumeration(p.timezone, ['Asia/Ho_Chi_Minh'], 'timezone'); if (p.range !== 'ALL_TIME' || p.period !== null) throw new AdminContractError('revenue.ALL_TIME') }
  else meta(p, 'snapshot_at')
  enumeration(p.source, ['REAL', 'DEMO', 'LEGACY_UNKNOWN', 'ALL'], 'source')
  const s = object(p.summary, 'summary'); numbers(s, ['collected_amount', 'paid_orders', 'previous_collected_amount', 'legacy_unknown_orders'], 'summary'); decimal(s.average_paid_amount, 'average_paid_amount')
  if (s.paid_orders === 0 && s.average_paid_amount !== 0) throw new AdminContractError('average_paid_amount')
  for (const item of array(p.daily_series, 'daily_series', 366)) { const r = object(item, 'daily_series.item'); date(r.date, 'date'); numbers(r, ['amount', 'paid_orders'], 'daily_series') }
  for (const item of array(p.by_plan, 'by_plan', 3)) { const r = object(item, 'by_plan.item'); enumeration(r.plan_tier, plans, 'plan_tier'); numbers(r, ['amount', 'paid_orders'], 'by_plan') }
  return p as unknown as RevenueSummaryDto
}
export function mapReport(payload: unknown): ReportDto {
  const p = object(payload, 'report'); meta(p, 'generated_at'); enumeration(p.type, ['OPERATIONS', 'USERS_SUBSCRIPTIONS', 'REVENUE'], 'report.type')
  const summary = object(p.summary, 'report.summary')
  const required = p.type === 'OPERATIONS' ? ['created_requests', 'pending_expert', 'pending_consultation', 'completed_in_cohort', 'cancelled_in_cohort', 'past_end_uncompleted'] : p.type === 'USERS_SUBSCRIPTIONS' ? ['new_users', 'current_free_users', 'current_plan_99k_users', 'current_plan_399k_users'] : ['collected_amount', 'paid_orders']
  numbers(summary, required, 'report.summary')
  if (p.type === 'REVENUE') { decimal(summary.average_paid_amount, 'average_paid_amount'); enumeration(summary.source, ['REAL', 'DEMO', 'LEGACY_UNKNOWN', 'ALL'], 'summary.source') }
  const page = mapAdminPage(payload, (item) => {
    if (p.type === 'OPERATIONS') { const a = mapAppointment(item); if (a.review_rating != null && (!Number.isInteger(a.review_rating) || a.review_rating < 1 || a.review_rating > 5)) throw new AdminContractError('review_rating'); return a }
    if (p.type === 'REVENUE') { const payment = mapPayment(item); if (payment.status !== 'PAID' || !payment.paid_at) throw new AdminContractError('report.PAID.paid_at'); return payment }
    const u = object(item, 'report.user'); id(u.user_id, 'user_id'); nullableText(u.display_name, 'display_name'); timestamp(u.created_at, 'created_at'); enumeration(u.account_status, ['ACTIVE', 'LOCKED', 'DISABLED'], 'account_status'); enumeration(u.current_plan_tier, plans, 'current_plan_tier'); if (u.subscription_end_date != null) timestamp(u.subscription_end_date, 'subscription_end_date'); return u as unknown as UserCohortDto
  })
  return { ...p, ...page } as ReportDto
}
export const mapAppointmentsPage = (p: unknown) => mapAdminPage(p, mapAppointment)
export const mapPaymentsPage = (p: unknown) => mapAdminPage(p, mapPayment)
export const mapSubscriptionsPage = (p: unknown) => mapAdminPage(p, mapSubscription)
export function assertPaymentSource<T extends { source: string }>(items: readonly T[], source: string) {
  if (source !== 'ALL' && items.some((item) => item.source !== source)) throw new AdminContractError('payment.source.filter')
}
