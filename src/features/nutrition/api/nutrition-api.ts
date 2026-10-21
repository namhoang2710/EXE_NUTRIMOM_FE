import { catalogPath, shoppingPath } from '../model/nutrition-helpers.ts'
import { nutritionTtl as ttl } from '../model/nutrition-resources.ts'
import {
  invalidateNutrition,
  nutritionRead,
  nutritionWrite,
  seedNutrition,
  nutritionSnapshot,
} from './nutrition-requests.ts'
import type {
  Alternatives,
  CatalogFilters,
  DiaryCreate,
  DiaryPatch,
  DiaryView,
  FeedbackType,
  MealFeedback,
  CursorRecipes,
  IngredientOption,
  ItemPatch,
  MealPlan,
  MealType,
  NutritionProfile,
  PlanConstraints,
  PlanEdit,
  PlanVersions,
  Preview,
  PreviewRequest,
  ProfilePatch,
  SaveNutritionProfileResponse,
  RecipeDetail,
  Recommendations,
  ShoppingList,
  ShoppingPatch,
  ShoppingScope,
} from '../model/nutrition-types.ts'

const id = encodeURIComponent
const json = (method: string, body: unknown) => ({
  method,
  body: JSON.stringify(body),
})
let profileRevision = 0
function planAcceptor() {
  const revision = profileRevision
  return (plan: MealPlan) => {
    // A plan mutation begun before a profile save may return its older view late.
    // Keep the cache invalidated; the active consumer refreshes after that save.
    acceptPlan(plan, revision === profileRevision)
  }
}
function editAcceptor() {
  const accept = planAcceptor()
  return (result: PlanEdit) => accept(result.plan)
}
function acceptPlan(plan: MealPlan, cachePlan = true) {
  invalidateNutrition(`alternatives:${plan.plan_id}:`)
  invalidateNutrition(`shopping:${plan.plan_id}:`)
  invalidateNutrition('diary:')
  if (cachePlan) seedNutrition(`plan:${plan.plan_id}`, plan, ttl.live)
}
function acceptDiary(view: DiaryView) {
  invalidateNutrition('diary:')
  invalidateNutrition('recommendations:')
  seedNutrition(`diary:${view.local_date}`, view, ttl.live)
}
function acceptShopping(list: ShoppingList) {
  invalidateNutrition(`shopping:${list.plan_id}:`)
  seedNutrition(
    `shopping:${list.plan_id}:${shoppingPath(list.plan_id, { start_date: list.start_date, end_date: list.end_date, exclude_item_ids: [] })}`,
    list,
    ttl.live,
  )
}
export const nutritionApi = {
  cached: {
    profile: () => nutritionSnapshot<NutritionProfile>('profile', ttl.profile),
    plan: (planId: string) =>
      nutritionSnapshot<MealPlan>(`plan:${planId}`, ttl.live),
    diary: (date: string) =>
      nutritionSnapshot<DiaryView>(`diary:${date}`, ttl.live),
  },
  diary: (date: string, signal?: AbortSignal, fresh = false) =>
    nutritionRead<DiaryView>(
      `diary:${date}`,
      `/diary?${new URLSearchParams({ date })}`,
      ttl.live,
      signal,
      {},
      fresh,
    ),
  createDiary: (body: DiaryCreate) =>
    nutritionWrite<DiaryView>(
      '/diary-entries',
      json('POST', body),
      acceptDiary,
    ),
  patchDiary: (entryId: string, body: DiaryPatch) =>
    nutritionWrite<DiaryView>(
      `/diary-entries/${id(entryId)}`,
      json('PATCH', body),
      acceptDiary,
    ),
  deleteDiary: (entryId: string) =>
    nutritionWrite<DiaryView>(
      `/diary-entries/${id(entryId)}`,
      { method: 'DELETE' },
      acceptDiary,
    ),
  feedback: (recipeId: string, type: FeedbackType) =>
    nutritionWrite<MealFeedback>(
      '/meal-feedback',
      json('POST', { recipe_id: recipeId, type }),
      () => {
        invalidateNutrition('recommendations:')
        invalidateNutrition('alternatives:')
      },
    ),
  profile: (signal?: AbortSignal, fresh = false) =>
    nutritionRead<NutritionProfile>(
      'profile',
      '/me/nutrition-profile',
      ttl.profile,
      signal,
      {},
      fresh,
    ),
  saveProfile: (body: ProfilePatch) =>
    nutritionWrite<SaveNutritionProfileResponse>(
      '/me/nutrition-profile',
      json('PUT', body),
      (result) => {
        profileRevision += 1
        invalidateNutrition('recommendations:')
        invalidateNutrition('alternatives:')
        invalidateNutrition('plan:')
        seedNutrition('profile', result.profile, ttl.profile)
      },
    ),
  allergens: (signal?: AbortSignal) =>
    nutritionRead<{ id: string; name: string }[]>(
      'allergens',
      '/allergens',
      ttl.allergens,
      signal,
      { authenticated: false },
    ),
  ingredients: (q: string, signal?: AbortSignal) =>
    nutritionRead<IngredientOption[]>(
      `ingredients:${q.trim().toLocaleLowerCase('vi')}`,
      `/ingredients?${new URLSearchParams({ q: q.trim(), limit: '20' })}`,
      ttl.catalog,
      signal,
      { authenticated: false },
    ),
  recipes: (filters: CatalogFilters, signal?: AbortSignal) =>
    nutritionRead<CursorRecipes>(
      `catalog:${catalogPath(filters)}`,
      catalogPath(filters),
      ttl.catalog,
      signal,
      { authenticated: false },
    ),
  recipe: (recipeId: string, signal?: AbortSignal) =>
    nutritionRead<RecipeDetail>(
      `recipe:${recipeId}`,
      `/recipes/${id(recipeId)}`,
      ttl.catalog,
      signal,
      { authenticated: false },
    ),
  recommendations: (
    mealTypes: MealType[],
    signal?: AbortSignal,
    profileVersion = 0,
    date = '',
  ) =>
    nutritionRead<Recommendations>(
      `recommendations:${profileVersion}:${date}:${[...mealTypes].sort().join(',')}`,
      '/recommendations',
      ttl.suggestions,
      signal,
      json('POST', { meal_types: mealTypes, limit: 3 }),
    ),
  preview: (body: PreviewRequest) =>
    nutritionWrite<Preview>('/meal-plans/preview', json('POST', body)),
  savePlan: (previewId: string) =>
    nutritionWrite<MealPlan>(
      '/meal-plans',
      json('POST', { preview_id: previewId }),
      planAcceptor(),
    ),
  plan: (planId: string, signal?: AbortSignal, fresh = false) =>
    nutritionRead<MealPlan>(
      `plan:${planId}`,
      `/meal-plans/${id(planId)}`,
      ttl.live,
      signal,
      {},
      fresh,
    ),
  alternatives: (
    planId: string,
    itemId: string,
    signal?: AbortSignal,
    version = 0,
    profileVersion = 0,
  ) =>
    nutritionRead<Alternatives>(
      `alternatives:${planId}:${itemId}:${version}:${profileVersion}`,
      `/meal-plans/${id(planId)}/items/${id(itemId)}/alternatives`,
      ttl.live,
      signal,
    ),
  patchItem: (planId: string, itemId: string, body: PlanVersions & ItemPatch) =>
    nutritionWrite<PlanEdit>(
      `/meal-plans/${id(planId)}/items/${id(itemId)}`,
      json('PATCH', body),
      editAcceptor(),
    ),
  regenerate: (
    planId: string,
    body: PlanVersions & { constraints?: PlanConstraints; seed: number },
  ) =>
    nutritionWrite<PlanEdit>(
      `/meal-plans/${id(planId)}/regenerate`,
      json('POST', body),
      editAcceptor(),
    ),
  undo: (planId: string, body: PlanVersions) =>
    nutritionWrite<PlanEdit>(
      `/meal-plans/${id(planId)}/undo`,
      json('POST', body),
      editAcceptor(),
    ),
  shopping: (planId: string, scope: ShoppingScope, signal?: AbortSignal) =>
    nutritionRead<ShoppingList>(
      `shopping:${planId}:${shoppingPath(planId, scope)}`,
      shoppingPath(planId, scope),
      ttl.live,
      signal,
    ),
  addShopping: (
    planId: string,
    scope: ShoppingScope,
    body: { text: string; quantity?: number; unit?: string },
  ) =>
    nutritionWrite<ShoppingList>(
      shoppingPath(planId, scope, true),
      json('POST', body),
      acceptShopping,
    ),
  patchShopping: (itemId: string, body: ShoppingPatch) =>
    nutritionWrite<ShoppingList>(
      `/shopping-list-items/${id(itemId)}`,
      json('PATCH', body),
      acceptShopping,
    ),
  deleteShopping: (itemId: string) =>
    nutritionWrite<ShoppingList>(
      `/shopping-list-items/${id(itemId)}`,
      { method: 'DELETE' },
      acceptShopping,
    ),
}
