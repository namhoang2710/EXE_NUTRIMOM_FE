// Wire DTOs follow the snake_case domain APIs used by maternity and user slices.
export type GenerationStatus = 'READY' | 'READY_WITH_NOTES' | 'NO_MATCH'
export type LifecycleState = 'SAVED' | 'NEEDS_UPDATE'
export type NutritionCoverage = 'COMPLETE' | 'PARTIAL'
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
export type RecipeRole =
  'MAIN_DISH' | 'STAPLE' | 'PROTEIN' | 'VEGETABLE' | 'SIDE' | 'SNACK'
export type AllergyStatus = 'KNOWN_NONE' | 'KNOWN_LIST' | 'UNKNOWN'
export type DietPattern =
  'OMNIVORE' | 'PESCATARIAN' | 'LACTO_OVO_VEGETARIAN' | 'VEGAN'
export type ActivityCategory =
  'INACTIVE' | 'LOW_ACTIVE' | 'ACTIVE' | 'VERY_ACTIVE'
export interface Reason {
  code: string
  message: string
}
export interface PregnancyMilestone {
  pregnancy_id: string
  timezone: string
  local_date: string
  estimated_due_date?: string | null
  gestational_week: number
  gestational_day: number
  trimester: number
  auto_plan_paused: boolean
}
export interface EnergyInputs {
  age_years?: number | null
  height_cm?: number | null
  pre_pregnancy_weight_kg?: number | null
  current_weight_kg?: number | null
  activity_category?: ActivityCategory | null
}
export interface NutritionProfile {
  profile_id: string
  profile_version: number
  pregnancy: PregnancyMilestone
  allergy_status: AllergyStatus
  allergen_ids: string[]
  allergy_checked_label_allowed: boolean
  needs_allergy_confirmation: boolean
  diet_pattern?: DietPattern | null
  hard_exclusion_ingredient_ids: string[]
  disliked_ingredient_ids: string[]
  tolerance_tags: string[]
  favorite_recipe_ids: string[]
  blocked_recipe_ids: string[]
  daily_budget_vnd?: number | null
  max_minutes_per_meal?: number | null
  meal_types: MealType[]
  snack_count?: number | null
  energy_inputs?: EnergyInputs | null
  energy_estimate?: {
    kcal_per_day?: number | null
    rules_version: string
    unmet: { field: string; kind: string }[]
  } | null
}
export interface ProfilePatch extends EnergyInputs {
  allergy_status?: AllergyStatus
  allergen_ids?: string[]
  diet_pattern?: DietPattern
  hard_exclusion_ingredient_ids?: string[]
  disliked_ingredient_ids?: string[]
  tolerance_tags?: string[]
  favorite_recipe_ids?: string[]
  blocked_recipe_ids?: string[]
  daily_budget_vnd?: number
  max_minutes_per_meal?: number
  meal_types?: MealType[]
  snack_count?: number
}
export interface SaveNutritionProfileResponse {
  profile: NutritionProfile
  profile_version: number
  items_to_revalidate: string[]
}
export interface RecipeSummary {
  id: string
  name: string
  version: number
  role: RecipeRole
  meal_types: MealType[]
  minutes?: number | null
  servings_yield: number
  serving_gram?: number | null
  image_url?: string | null
}
export interface IngredientOption {
  id: string
  canonical_name: string
  food_group: string
  allergen_status: 'KNOWN' | 'UNKNOWN'
}
export interface RecipeDetail {
  summary: RecipeSummary
  steps: string
  safety_notes?: string | null
  ingredients: {
    ingredient_id: string
    canonical_name: string
    quantity_gram?: number | null
    preparation_state: string
    allergen_status: string
    allergen_ids: string[]
    price?: {
      price_per_base_unit_vnd: number
      base_unit: string
      estimated_at: string
    } | null
  }[]
  data_state: {
    nutrient_codes_missing_data: string[]
    ingredients_with_unknown_allergen: string[]
    price_known_for_all_ingredients: boolean
  }
}
export interface CursorRecipes {
  items: RecipeSummary[]
  next_cursor?: string | null
  has_more: boolean
}
export interface CatalogFilters {
  mealType?: MealType
  role?: RecipeRole
  maxMinutes?: number
  cursor?: string
  limit?: number
}
export interface Recommendations {
  profile_version: number
  allergy_checked: boolean
  notes: Reason[]
  meals: {
    meal_type: MealType
    status: GenerationStatus
    notes: Reason[]
    items: {
      recipe_id: string
      name: string
      role: RecipeRole
      minutes?: number | null
      nutrition_status: NutritionCoverage
      reasons: Reason[]
    }[]
  }[]
}
export interface PlanConstraints {
  daily_budget_vnd?: number
  max_minutes_per_meal?: number
  strict_budget: boolean
  strict_time: boolean
}
export interface PreviewRequest {
  request_id: string
  profile_version: number
  start_date: string
  day_count: 1 | 3 | 7
  meal_types: MealType[]
  snack_count: number
  constraints: PlanConstraints
  seed: number
  locked_items?: {
    meal_type: MealType
    sequence?: number
    recipe_id: string
    servings: number
  }[]
}
export interface Nutrient {
  known_value?: number | null
  unit: string
  coverage: NutritionCoverage
  missing_ingredient_ids?: string[]
}
export interface PlanItem {
  item_id?: string
  recipe_id: string
  recipe_version: number
  name: string
  role: RecipeRole
  servings: number
  serving_gram?: number | null
  minutes?: number | null
  locked: boolean
  conflict: boolean
  estimated_cost_vnd?: number | null
  reason_codes: Reason[]
}
export interface PlanSlot {
  meal_type: MealType
  sequence: number
  filled: boolean
  items: PlanItem[]
  reason_codes: Reason[]
}
export interface PlanDay {
  local_date: string
  slots: PlanSlot[]
  nutrition: Record<string, Nutrient>
  method_notes: string[]
  estimated_cost_vnd?: number | null
  notes?: Reason[]
}
export interface Preview {
  preview_id: string
  status: GenerationStatus
  profile_version: number
  nutrition_coverage: NutritionCoverage
  expires_at: string
  notes: Reason[]
  days: PlanDay[]
}
export interface MealPlan {
  plan_id: string
  generation_status: GenerationStatus
  lifecycle_state: LifecycleState
  plan_version: number
  profile_version: number
  start_date: string
  end_date: string
  nutrition_coverage: NutritionCoverage
  notes: Reason[]
  days: PlanDay[]
}
export interface PlanVersions {
  expected_plan_version: number
  expected_profile_version: number
}
export interface ItemPatch {
  recipe_id?: string
  recipe_version?: number
  servings?: number
  grams?: number
  locked?: boolean
}
export interface PlanEdit {
  plan: MealPlan
  changed: boolean
  shopping_list_version: number
  undo_available: boolean
  notes: Reason[]
}
export interface Alternatives {
  item_id: string
  role: RecipeRole
  current_servings: number
  serving_options: number[]
  notes: Reason[]
  alternatives: {
    recipe_id: string
    recipe_version: number
    name: string
    minutes?: number | null
    estimated_cost_vnd?: number | null
    delta_cost_vnd?: number | null
    delta_minutes?: number | null
  }[]
}
export type ShoppingState = 'NEEDED' | 'HAVE' | 'PURCHASED'
export interface ShoppingItem {
  item_id: string
  ingredient_id?: string | null
  name: string
  food_state?: string | null
  state: ShoppingState
  quantity?: number | null
  unit?: string | null
  have_quantity?: number | null
  purchased_quantity?: number | null
  remaining_quantity?: number | null
  estimated_cost_vnd?: number | null
  custom_text?: string | null
  used_by: {
    plan_item_id: string
    recipe_id: string
    name: string
    quantity: number
  }[]
  notes: Reason[]
}
export interface ShoppingList {
  list_id: string
  plan_id: string
  shopping_list_version: number
  start_date: string
  end_date: string
  groups: { food_group?: string | null; items: ShoppingItem[] }[]
  estimated_cost_vnd?: number | null
  estimated_remaining_cost_vnd?: number | null
  cost_coverage: NutritionCoverage
  notes: Reason[]
}
export interface ShoppingScope {
  start_date?: string
  end_date?: string
  exclude_item_ids: string[]
}
export interface ShoppingPatch {
  state?: ShoppingState
  have_quantity?: number
  purchased_quantity?: number
  unit?: string
  custom_text?: string
}

export interface DiaryEntry {
  entry_id: string
  local_date: string
  meal_type: MealType
  recipe_id?: string | null
  name: string
  recipe_version?: number | null
  servings?: number | null
  custom_text?: string | null
  amount_text?: string | null
  estimate_incomplete: boolean
  source_plan_item_id?: string | null
  nutrition?: Record<string, Nutrient> | null
  coverage: NutritionCoverage
  created_at: string
  notes: Reason[]
}
export interface DiaryView {
  local_date: string
  entries: DiaryEntry[]
  planned_nutrition: Record<string, Nutrient>
  planned_coverage: NutritionCoverage
  logged_nutrition: Record<string, Nutrient>
  logged_coverage: NutritionCoverage
  remaining: {
    energy_target_kcal?: number | null
    by_nutrient: Record<string, Nutrient>
    notes: Reason[]
  }
  method_notes: string[]
  notes: Reason[]
}
export interface DiaryCreate {
  request_id: string
  local_date: string
  meal_type: MealType
  recipe_id?: string
  source_plan_item_id?: string
  servings?: number
  custom_text?: string
  amount_text?: string
  estimate_incomplete?: boolean
}
export type DiaryPatch = Partial<
  Omit<DiaryCreate, 'request_id' | 'source_plan_item_id'>
>
export type FeedbackType = 'TASTY' | 'DISLIKE' | 'HARD_NOW'
export interface MealFeedback {
  feedback_id: string
  recipe_id: string
  type: FeedbackType
  created_at: string
  expires_at?: string | null
  notes: Reason[]
}
