import type {
  CatalogFilters,
  DiaryCreate,
  DiaryPatch,
  DiaryEntry,
  MealPlan,
  NutritionProfile,
  PlanVersions,
  PreviewRequest,
  ShoppingScope,
} from './nutrition-types.ts'

export const mealLabels = {
  BREAKFAST: 'Bữa sáng',
  LUNCH: 'Bữa trưa',
  DINNER: 'Bữa tối',
  SNACK: 'Bữa phụ',
} as const
export const roleLabels = {
  MAIN_DISH: 'Món hoàn chỉnh',
  STAPLE: 'Tinh bột',
  PROTEIN: 'Đạm',
  VEGETABLE: 'Rau',
  SIDE: 'Ăn kèm',
  SNACK: 'Ăn nhẹ',
} as const
export const groupLabels: Record<string, string> = {
  VEGETABLE_FRUIT: 'Rau củ và trái cây',
  MEAT_FISH_EGG: 'Thịt, cá và trứng',
  GRAIN: 'Ngũ cốc',
  DAIRY: 'Sữa',
  LEGUME_NUT: 'Đậu và hạt',
  SEASONING: 'Gia vị',
  OTHER: 'Khác',
}
export const foodStateLabels: Record<string, string> = {
  RAW: 'Sống',
  COOKED: 'Đã nấu chín',
  DRIED: 'Khô',
  PROCESSED: 'Đã chế biến',
}
export const nutrientLabels: Record<string, string> = {
  ENERGY: 'Năng lượng',
  PROTEIN: 'Protein',
  FAT: 'Chất béo',
  CARBOHYDRATE: 'Carbohydrate',
  FOLATE: 'Folate',
  IRON: 'Sắt',
  CALCIUM: 'Canxi',
  CHOLINE: 'Choline',
  IODINE: 'Iốt',
  VITAMIN_D: 'Vitamin D',
}
const unitLabels: Record<string, string> = { mcg_dfe: 'µg DFE', mcg: 'µg' }
export const numberText = (value: number | null | undefined, unit = '') =>
  value == null
    ? 'Chưa đủ dữ liệu'
    : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)}${unit ? ` ${unitLabels[unit] || unit}` : ''}`
export const moneyText = (value?: number | null) =>
  value == null ? 'Chưa có giá' : numberText(value, '₫')
export const deltaText = (value: number | null | undefined, unit: string) =>
  value == null
    ? 'Chưa có dữ liệu chênh lệch'
    : `${value > 0 ? '+' : ''}${numberText(value, unit)}`
export function catalogPath(filters: CatalogFilters) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters))
    if (value != null && value !== '') query.set(key, String(value))
  return `/recipes?${query}`
}
export function shoppingPath(
  planId: string,
  scope: ShoppingScope,
  custom = false,
) {
  const query = new URLSearchParams()
  if (scope.start_date) query.set('start_date', scope.start_date)
  if (scope.end_date) query.set('end_date', scope.end_date)
  if (!custom)
    for (const id of scope.exclude_item_ids)
      query.append('exclude_item_ids', id)
  return `/meal-plans/${encodeURIComponent(planId)}/shopping-list${custom ? '/items' : ''}${query.size ? `?${query}` : ''}`
}
export function versions(
  plan: MealPlan,
  profile: NutritionProfile,
): PlanVersions {
  return {
    expected_plan_version: plan.plan_version,
    expected_profile_version: profile.profile_version,
  }
}
export const conflictingItems = (plan: MealPlan) =>
  plan.days.flatMap((day) => day.slots.flatMap((slot) => slot.items.filter((item) => item.conflict)))
export const planNeedsReview = (plan: MealPlan) =>
  plan.lifecycle_state === 'NEEDS_UPDATE' || conflictingItems(plan).length > 0
export function localDate(timezone = 'Asia/Ho_Chi_Minh', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
export function validDate(value: string | null): value is string {
  return Boolean(
    value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
  )
}
export function nutritionUrl(tab: string, date: string, plan?: string | null) {
  const query = new URLSearchParams({ tab, date })
  if (plan) query.set('plan', plan)
  return `/app/nutrition?${query}`
}
// Store identifiers only. Every displayed plan is fetched again with the current JWT.
export function indexKey(accountId: string) {
  return `nutrimom.nutrition.plans.v1:${encodeURIComponent(accountId)}`
}
export type PlanIndex = Record<string, string>
export function readPlanIndex(
  storage: Pick<Storage, 'getItem'>,
  accountId: string,
): PlanIndex {
  try {
    const raw: unknown = JSON.parse(
      storage.getItem(indexKey(accountId)) || '{}',
    )
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return Object.fromEntries(
      Object.entries(raw).filter(
        ([date, id]) =>
          validDate(date) &&
          typeof id === 'string' &&
          id.length > 0 &&
          id.length <= 64,
      ),
    )
  } catch {
    return {}
  }
}
export function rememberPlan(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  accountId: string,
  plan: MealPlan,
) {
  const index = readPlanIndex(storage, accountId)
  for (const day of plan.days) index[day.local_date] = plan.plan_id
  try {
    storage.setItem(indexKey(accountId), JSON.stringify(index))
    return true
  } catch {
    return false
  }
}
// Freeze both request id and payload across uncertain network failures, including seed/version.
export class RequestAttempt<T> {
  private serialized: string | null = null
  begin(body: T) {
    this.serialized = JSON.stringify(body)
    return JSON.parse(this.serialized) as T
  }
  retry() {
    return this.serialized ? (JSON.parse(this.serialized) as T) : null
  }
  clear() {
    this.serialized = null
  }
}
export class PreviewAttempt extends RequestAttempt<PreviewRequest> {}
export class DiaryAttempt extends RequestAttempt<DiaryCreate> {}

// Omitting an unchanged recipe preserves the stored historical recipe snapshot and plan link.
export function diaryPatch(
  entry: DiaryEntry,
  body: Omit<DiaryCreate, 'request_id'>,
): DiaryPatch {
  const patch: DiaryPatch = {}
  for (const key of [
    'local_date',
    'meal_type',
    'servings',
    'custom_text',
    'amount_text',
    'estimate_incomplete',
    'recipe_id',
  ] as const) {
    if (body[key] !== undefined && body[key] !== entry[key])
      Object.assign(patch, { [key]: body[key] })
  }
  return patch
}
export function halfServings(planned: number) {
  return planned * 0.5
}
export function optionalNumber(value: string) {
  return value.trim() === '' ? undefined : Number(value)
}
export function servingBounds(options: number[]) {
  const valid = options.filter((value) => Number.isFinite(value) && value > 0)
  return valid.length
    ? { min: Math.min(...valid), max: Math.max(...valid) }
    : null
}
