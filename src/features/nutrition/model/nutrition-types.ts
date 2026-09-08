export type NutritionPlanStatus = 'DRAFT' | 'REVIEW_REQUIRED' | 'ACTIVE' | 'ARCHIVED'

export type NutritionSubmission<T> =
  | { status: 'accepted'; requestId: string }
  | { status: 'completed'; data: T }
