// Pure synthetic data reused by the USER HTTP fixture; no browser or server side effects.
const date = '2026-10-18'
const user = {
  id: 'nutrition-account-a',
  phone: '0901112233',
  display_name: 'Minh Anh',
  role: 'MOM',
  roles: ['USER'],
  status: 'ACTIVE',
  onboarding_status: 'COMPLETED',
  created_at: '2026-10-01T00:00:00Z',
}
const baseProfile = {
  profile_id: 'pregnancy-qa',
  profile_version: 2,
  pregnancy: {
    pregnancy_id: 'pregnancy-qa',
    local_date: date,
    timezone: 'Asia/Ho_Chi_Minh',
    gestational_week: 20,
    gestational_day: 2,
    trimester: 2,
    estimated_due_date: '2027-03-05',
    auto_plan_paused: false,
  },
  allergy_status: 'KNOWN_NONE',
  allergen_ids: [],
  allergy_checked_label_allowed: true,
  needs_allergy_confirmation: false,
  hard_exclusion_ingredient_ids: [],
  disliked_ingredient_ids: ['ing.fish'],
  tolerance_tags: [],
  favorite_recipe_ids: ['rec.other'],
  blocked_recipe_ids: [],
  daily_budget_vnd: 120000,
  max_minutes_per_meal: 30,
  meal_types: ['LUNCH'],
  snack_count: null,
  energy_estimate: {
    kcal_per_day: null,
    rules_version: 'qa',
    unmet: [{ field: 'height_cm', kind: 'MISSING' }],
  },
}
const summaries = [
  {
    id: 'rec.rice',
    name: 'Cơm trắng',
    version: 1,
    role: 'STAPLE',
    meal_types: ['LUNCH'],
    minutes: 25,
    servings_yield: 4,
    serving_gram: 180,
  },
  {
    id: 'rec.rice2',
    name: 'Cơm gạo lứt',
    version: 2,
    role: 'STAPLE',
    meal_types: ['LUNCH'],
    minutes: 30,
    servings_yield: 3,
    serving_gram: 160,
  },
  {
    id: 'rec.soup',
    name: 'Canh rau củ',
    version: 1,
    role: 'VEGETABLE',
    meal_types: ['DINNER'],
    minutes: 15,
    servings_yield: 2,
  },
]
function planFor(profile = baseProfile, version = 1) {
  return {
    plan_id: 'plan-qa',
    generation_status: 'READY_WITH_NOTES',
    lifecycle_state: 'SAVED',
    plan_version: version,
    profile_version: profile.profile_version,
    start_date: date,
    end_date: date,
    nutrition_coverage: 'PARTIAL',
    notes: [
      { code: 'PARTIAL_DAY_PLAN', message: 'Đây là kế hoạch một phần ngày.' },
    ],
    days: [
      {
        local_date: date,
        slots: [
          {
            meal_type: 'LUNCH',
            sequence: 1,
            template_code: 'LUNCH:ROLE_SET',
            mode: 'ROLE_SET',
            required_roles: ['STAPLE'],
            filled: true,
            reason_codes: [],
            items: [
              {
                item_id: 'item-rice',
                recipe_id: 'rec.rice',
                recipe_version: 1,
                name: 'Cơm trắng',
                role: 'STAPLE',
                servings: 1,
                serving_gram: 180,
                minutes: 25,
                locked: false,
                conflict: false,
                reason_codes: [
                  { code: 'QUICK_TO_COOK', message: 'Khoảng 25 phút nấu' },
                ],
                estimated_cost_vnd: null,
              },
            ],
          },
        ],
        nutrition: {
          ENERGY: { known_value: 612.5, unit: 'kcal', coverage: 'COMPLETE' },
          PROTEIN: { known_value: 8.2, unit: 'g', coverage: 'COMPLETE' },
          FOLATE: { known_value: 8, unit: 'mcg_dfe', coverage: 'PARTIAL' },
          IODINE: { known_value: null, unit: 'mcg', coverage: 'PARTIAL' },
        },
        method_notes: ['Giả định hệ số giữ lại bằng 1 khi thiếu dữ liệu.'],
        estimated_cost_vnd: null,
      },
    ],
  }
}
function expandPlan(plan, count, start = date) {
  const template = structuredClone(plan.days[0])
  plan.days = Array.from({ length: count }, (_, index) => {
    const day = structuredClone(template)
    day.local_date = new Date(
      Date.parse(`${start}T00:00:00Z`) + index * 86400000,
    )
      .toISOString()
      .slice(0, 10)
    day.slots.forEach((slot) =>
      slot.items.forEach((item) => {
        if (index) item.item_id += `-${index}`
      }),
    )
    return day
  })
  plan.start_date = start
  plan.end_date = plan.days.at(-1).local_date
}
export { date, user, baseProfile, summaries, planFor, expandPlan }
