export const consultationStatuses = ['PENDING_EXPERT', 'PENDING_CONSULTATION', 'COMPLETED', 'CANCELLED'] as const
export const specialties = ['PSYCHOLOGY', 'OBSTETRICS', 'HEALTH'] as const
export const paymentStatuses = ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'] as const
export const paymentSources = ['REAL', 'DEMO', 'LEGACY_UNKNOWN', 'ALL'] as const
export const plans = ['FREE', 'PLAN_99K', 'PLAN_399K'] as const
export const reportTypes = ['OPERATIONS','USERS_SUBSCRIPTIONS','REVENUE','EXPERT_PERFORMANCE'] as const
export type WorkspaceKind = 'dashboard' | 'appointments' | 'consultations' | 'experts' | 'payments' | 'subscriptions' | 'reports' | 'users' | 'support'
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function validOrderCode(value: string) { return /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n }
export function vietnamToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function realDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
}
export function dateRangeError(from: string, to: string, allowFuture = true, today = vietnamToday()) {
  if (!from && !to) return ''
  if (!from || !to) return 'Cần nhập cả ngày bắt đầu và ngày kết thúc.'
  if (!realDate(from) || !realDate(to)) return 'Ngày chưa hợp lệ.'
  if (from > to) return 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 + 1 > 366) return 'Khoảng ngày tối đa 366 ngày.'
  if (!allowFuture && to > today) return 'Ngày kết thúc không được vượt hôm nay.'
  return ''
}
export function kpiMonthEnd(day: string) {
  return new Date(Date.UTC(Number(day.slice(0,4)),Number(day.slice(5,7)),0)).toISOString().slice(0,10)
}
export function kpiDateRangeError(from: string, to: string, today = vietnamToday(), minimum?:string|null) {
  const error = dateRangeError(from,to,true,today)
  if (error || !from && !to) return error
  if (from < '1900-01-01' || to > '9998-12-31') return 'Kỳ KPI phải nằm từ năm 1900 đến 9998.'
  if (from > today) return 'Ngày bắt đầu KPI không được vượt hôm nay ở Việt Nam.'
  if (minimum && from < minimum) return `Dữ liệu lịch làm việc trong DB bắt đầu từ ${minimum.slice(8,10)}/${minimum.slice(5,7)}/${minimum.slice(0,4)}. Chọn ngày từ mốc này trở đi.`
  if (to > kpiMonthEnd(today)) return 'Ngày kết thúc KPI không được vượt cuối tháng hiện tại.'
  return ''
}
export function kpiPeriod(from: string, to: string) {
  const previousTo = new Date(Date.parse(from)-86400000).toISOString().slice(0,10)
  const fullMonth = from.endsWith('-01') && to === kpiMonthEnd(from)
  return {from_date:from,to_date:to,previous_from_date:fullMonth?`${previousTo.slice(0,7)}-01`:
    new Date(Date.parse(from)-(Date.parse(to)-Date.parse(from)+86400000)).toISOString().slice(0,10),previous_to_date:previousTo}
}
const labels: Record<string, string> = {
  PENDING_EXPERT: 'Chờ chuyên gia', PENDING_CONSULTATION: 'Chờ tư vấn', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy',
  PSYCHOLOGY: 'Tâm lý', OBSTETRICS: 'Sản khoa', HEALTH: 'Sức khỏe', ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', EXPIRED: 'Hết hạn', NOT_STARTED: 'Chưa bắt đầu',
  PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', REAL: 'Thực', DEMO: 'Thử nghiệm', LEGACY_UNKNOWN: 'Chưa xác định', ALL: 'Tất cả',
  FREE: 'Miễn phí', PLAN_99K: 'Gói 99K', PLAN_399K: 'Gói 399K', SCHEDULED: 'Ngày có lịch', CREATED: 'Ngày tạo',
  true: 'Có', false: 'Không', USER: 'Người dùng', EXPERT: 'Chuyên gia', ADMIN: 'Quản trị viên', LOCKED: 'Đã khóa', DISABLED: 'Vô hiệu hóa',
  PROFILE_REQUIRED: 'Cần hồ sơ', CONTEXT_REQUIRED: 'Cần thông tin', CONTENT_EDITOR: 'Biên tập viên', CONTENT_REVIEWER: 'Người duyệt', CONTENT_PUBLISHER: 'Người xuất bản',
  OPERATIONS: 'Vận hành tư vấn', USERS_SUBSCRIPTIONS: 'Người dùng & Gói', REVENUE: 'Tiền thu', EXPERT_PERFORMANCE:'Hiệu suất chuyên gia', asc: 'Tăng dần', desc: 'Giảm dần',
  displayName: 'Tên', status: 'Trạng thái', createdAt: 'Ngày tạo', updatedAt: 'Ngày cập nhật', DIRECT: 'Chọn trực tiếp', RANDOM: 'Phân công tự động',
  draft: 'Bản nháp', published: 'Đã xuất bản', archived: 'Lưu trữ', scheduled: 'Đã lên lịch',
  MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác',
  'PENDING_CONSULTATION,PENDING_EXPERT': 'Chưa hoàn tất', IN_PROGRESS: 'Đang xử lý',
}
export const adminLabel = (value: string) => labels[value] ?? value
const commonEnums: Record<string, readonly string[]> = { specialty: specialties, planTier: plans, source: paymentSources, reviewed: ['true', 'false'], attentionOnly: ['true', 'false'] }
const allowed: Record<WorkspaceKind, string[]> = {
  dashboard: ['fromDate', 'toDate'], appointments: ['q', 'status', 'specialty', 'expertUserId', 'fromDate', 'toDate', 'dateBasis', 'attentionOnly'],
  consultations: ['q', 'specialty', 'expertUserId', 'fromDate', 'toDate', 'reviewed'], experts: ['q', 'specialty', 'status'],
  payments: ['q', 'planTier', 'status', 'source', 'fromDate', 'toDate', 'dateBasis', 'range'], subscriptions: ['q', 'planTier', 'effectiveStatus', 'expiringWithinDays'],
  reports: ['fromDate', 'toDate', 'source','specialty','expertUserId'], users: ['q', 'status', 'role', 'onboardingStatus', 'sortBy', 'sortDirection'],
  support: ['q', 'status', 'topic'],
}
export function parseWorkspaceQuery(search: URLSearchParams | string, kind: WorkspaceKind, today = vietnamToday()) {
  const raw = typeof search === 'string' ? new URLSearchParams(search) : search
  const query = new URLSearchParams()
  const errors: Record<string, string> = {}
  const keys = [...allowed[kind], ...(kind === 'dashboard' ? [] : ['page', 'pageSize'])]
  for (const key of keys) {
    if (raw.getAll(key).length > 1) errors[key] = 'Tham số bị lặp.'
    const value = raw.get(key)?.trim()
    if (value) query.set(key, value)
  }
  for (const key of ['page', 'pageSize', 'expiringWithinDays']) {
    const value = query.get(key)
    const max = key === 'page' ? Number.MAX_SAFE_INTEGER : key === 'pageSize' ? 100 : 30
    if (value && (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max)) errors[key] = `Cần số nguyên từ 1 đến ${max}.`
    if (raw.has(key) && !raw.get(key)?.trim()) errors[key] = 'Tham số số nguyên không được để trống.'
  }
  if (kind !== 'dashboard') { if (!query.has('page')) query.set('page', '1'); if (!query.has('pageSize')) query.set('pageSize', '20') }
  if ((query.get('q')?.length ?? 0) > 100) errors.q = 'Tìm kiếm tối đa 100 ký tự.'
  const enums = { ...commonEnums } as Record<string, readonly string[]>
  enums.range = ['PERIOD', 'ALL_TIME']
  enums.status = kind === 'appointments' ? consultationStatuses : kind === 'experts' ? ['ACTIVE', 'INACTIVE'] : kind === 'users' ? ['ACTIVE', 'LOCKED', 'DISABLED'] : kind === 'support' ? ['PENDING', 'COMPLETED', 'CANCELLED'] : paymentStatuses
  enums.topic = ['POLICY', 'APP_USAGE', 'ACCOUNT', 'OTHER']
  enums.dateBasis = kind === 'payments' ? ['CREATED', 'PAID'] : ['SCHEDULED', 'CREATED']
  enums.effectiveStatus = ['ACTIVE', 'EXPIRED', 'CANCELLED', 'NOT_STARTED']
  enums.role = ['USER', 'EXPERT', 'ADMIN', 'CONTENT_EDITOR', 'CONTENT_REVIEWER', 'CONTENT_PUBLISHER']
  enums.onboardingStatus = ['PROFILE_REQUIRED', 'CONTEXT_REQUIRED', 'COMPLETED']
  enums.sortBy = ['displayName', 'status', 'createdAt', 'updatedAt']; enums.sortDirection = ['asc', 'desc']
  for (const [key, values] of Object.entries(enums)) {
    const value = query.get(key)
    if (!value) continue
    const parts = key === 'status' && kind === 'appointments' ? value.split(',') : [value]
    if (parts.length > 4 || parts.some((part) => !values.includes(part))) errors[key] = 'Giá trị bộ lọc không hợp lệ.'
    else if (parts.length > 1) query.set(key, [...new Set(parts)].sort().join(','))
  }
  for (const key of ['userId', 'requestId', 'expertUserId']) {
    const value = raw.get(key)
    if (value !== null && (!uuidPattern.test(value) || raw.getAll(key).length > 1)) errors[key] = 'Mã định danh UUID không hợp lệ.'
  }
  if (raw.has('orderCode') && (!validOrderCode(raw.get('orderCode')!) || raw.getAll('orderCode').length > 1)) errors.orderCode = 'Mã đơn không hợp lệ.'
  if (raw.has('tab') && !['transactions', 'subscriptions'].includes(raw.get('tab')!)) errors.tab = 'Tab không hợp lệ.'
  if (raw.has('type') && !reportTypes.includes(raw.get('type') as typeof reportTypes[number])) errors.type = 'Loại báo cáo không hợp lệ.'
  const rangeError = kind==='reports' && raw.get('type')==='EXPERT_PERFORMANCE'
    ? kpiDateRangeError(query.get('fromDate')??'',query.get('toDate')??'',today)
    : dateRangeError(query.get('fromDate') ?? '', query.get('toDate') ?? '', !['dashboard', 'payments', 'reports'].includes(kind), today)
  if (rangeError) errors.fromDate = rangeError
  if (kind === 'payments' && query.get('range') === 'ALL_TIME' && (query.has('fromDate') || query.has('toDate'))) errors.range = 'Phạm vi Toàn bộ không nhận bộ lọc ngày.'
  if (['dashboard', 'payments', 'reports'].includes(kind) && !(kind==='reports'&&raw.get('type')==='EXPERT_PERFORMANCE') && query.get('range') !== 'ALL_TIME' && !query.has('fromDate') && !query.has('toDate')) { query.set('fromDate', `${today.slice(0, 7)}-01`); query.set('toDate', today) }
  if (['payments', 'reports'].includes(kind) && !query.has('source')) query.set('source', 'ALL')
  // Revenue is unified even when opening an older bookmarked source=REAL link.
  if (['payments','reports'].includes(kind)) query.set('source', 'ALL')
  if (kind === 'appointments' && raw.has('view') && !['all', 'waiting', 'calendar', 'pending'].includes(raw.get('view')!)) errors.view = 'Chế độ xem không hợp lệ.'
  if (kind === 'appointments' && !raw.has('status') && raw.get('view') !== 'all' && raw.get('view') !== 'calendar') query.set('status', 'PENDING_CONSULTATION,PENDING_EXPERT')
  query.sort()
  return { query, errors, valid: Object.keys(errors).length === 0, search: query.toString() }
}
