import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer, preview as previewServer } from 'vite'
const require = createRequire(import.meta.url)
const engines = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const output =
  process.env.NUTRITION_QA_OUTPUT || 'qa-artifacts/nutrition-redesign'
await mkdir(output, { recursive: true })
const production = process.env.NUTRITION_QA_MODE === 'production'
const port = Number(process.env.NUTRITION_QA_PORT || 5195)
const viteOptions = {
  // Concurrent QA servers must not invalidate each other's optimized dependency URLs.
  cacheDir: `node_modules/.vite-qa-${port}`,
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true,
    open: false,
    watch: { ignored: ['**/qa-artifacts/**'] },
  },
}
const runtimeServer = production
  ? await previewServer({
      ...(process.env.NUTRITION_QA_DIST ? { build: { outDir: process.env.NUTRITION_QA_DIST } } : {}),
      preview: { host: '127.0.0.1', port, strictPort: true, open: false },
    })
  : await createServer(viteOptions)
if (!production) await runtimeServer.listen()
const server = runtimeServer
// A real open SSE response keeps layout/resize tests from measuring fixture EOF reconnects.
server.middlewares.use('/__qa/admin-realtime', (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Accept-Language, X-Device-Id, X-Request-Id')
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return }
  response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' })
  response.write(`event: ready\ndata: ${JSON.stringify({ protocol_version:1, admin_user_id:'nutrition-account-a', dashboard_revision:'0', notifications_revision:'0', unread_count:0 })}\n\n`)
  const heartbeat = setInterval(() => response.write('event: heartbeat\ndata: {"protocol_version":1}\n\n'), 15_000)
  response.on('close', () => clearInterval(heartbeat))
})
// Register before Vite's SPA fallback, including when using previewServer.
const sseLayer = server.middlewares.stack.pop()
server.middlewares.stack.unshift(sseLayer)
const engine = process.env.NUTRIMOM_QA_BROWSER || 'chromium'
const browser = await engines[engine].launch({ ...(engine === 'chromium' ? { channel: 'chrome', ...(process.env.NUTRIMOM_QA_FAKE_MEDIA === '1' ? { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } : {}) } : {}), headless: true })
const passed = [],
  unexpected = [],
  pageErrors = [],
  consoleErrors = []
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
    image_url: '/nutrition-fixture-image.svg',
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
async function fixture(options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: options.reducedMotion || 'reduce',
    ...options.contextOptions,
  })
  const profile = structuredClone({ ...baseProfile, ...options.profile })
  const state = {
    profile,
    plan: planFor(profile),
    rows: {},
    custom: [],
    counts: {},
    writes: [],
    previewBodies: [],
    diaryEntries: [],
    diaryRequests: new Map(),
    diaryDates: [],
    maxConcurrentReads: 0,
    ...options,
  }
  state.profile = profile
  if (options.dayCount) expandPlan(state.plan, options.dayCount)
  if (options.plannedServings)
    state.plan.days[0].slots[0].items[0].servings = options.plannedServings
  function diaryView(localDate) {
    const entries = state.diaryEntries.filter(
      (entry) => entry.local_date === localDate,
    )
    const partial = entries.some(
      (entry) => !entry.recipe_id || entry.estimate_incomplete,
    )
    const logged = entries.filter((entry) => entry.recipe_id)
    return {
      local_date: localDate,
      entries,
      planned_nutrition:
        state.plan.days.find((day) => day.local_date === localDate)
          ?.nutrition || {},
      planned_coverage: 'PARTIAL',
      logged_nutrition: logged.length
        ? {
            ENERGY: {
              known_value: logged.reduce(
                (sum, entry) => sum + entry.servings * 270,
                0,
              ),
              unit: 'kcal',
              coverage: 'COMPLETE',
            },
            IODINE: { known_value: null, unit: 'mcg', coverage: 'PARTIAL' },
          }
        : {},
      logged_coverage: partial ? 'PARTIAL' : 'COMPLETE',
      remaining: {
        energy_target_kcal: null,
        by_nutrient: logged.length
          ? {
              ENERGY: {
                known_value: partial ? null : 1234,
                unit: 'kcal',
                coverage: partial ? 'PARTIAL' : 'COMPLETE',
              },
            }
          : {},
        notes: [
          {
            code: 'DIARY_REMAINING_ESTIMATE',
            message: 'Khoảng cách chỉ là ước tính từ các món đã ghi.',
          },
        ],
      },
      method_notes: [],
      notes: [
        {
          code: 'DIARY_LOGGED_TOTAL_ONLY',
          message: 'Tổng chỉ gồm các món đã ghi.',
        },
      ],
    }
  }
  if (options.noGrams) state.plan.days[0].slots[0].items[0].serving_gram = null
  await context.addInitScript(
    ({ user, theme, known, date }) => {
      localStorage.setItem('nutrimom.theme', theme)
      sessionStorage.setItem(
        'nutrimom.auth-session',
        JSON.stringify({
          accessToken: 'qa',
          refreshToken: 'qa-r',
          accessExpiresAt: Date.now() + 3600000,
          refreshExpiresAt: Date.now() + 86400000,
          tokenType: 'Bearer',
          user: {
            ...user,
            displayName: user.display_name,
            onboardingStatus: user.onboarding_status,
          },
        }),
      )
      if (known)
        localStorage.setItem(
          `nutrimom.nutrition.plans.v1:${user.id}`,
          JSON.stringify({ [date]: 'plan-qa' }),
        )
    },
    { user, theme: options.theme || 'light', known: options.known, date },
  )
  function shopping(url) {
    const excluded = url?.searchParams.getAll('exclude_item_ids') || []
    const changed = state.plan.plan_version > 1
    const base = [
      {
        item_id: 'shop-raw',
        ingredient_id: 'ing.rice',
        name: 'Gạo tẻ',
        food_state: 'RAW',
        quantity: changed ? 300 : 100,
        unit: 'g',
        used_by: [
          {
            plan_item_id: 'item-rice',
            recipe_id: 'rec.rice',
            name: state.plan.days[0].slots[0].items[0].name,
            quantity: 100,
          },
        ],
        notes: [],
      },
      {
        item_id: 'shop-cooked',
        ingredient_id: 'ing.rice',
        name: 'Cơm chín',
        food_state: 'COOKED',
        quantity: 180,
        unit: 'g',
        used_by: [
          {
            plan_item_id: 'item-rice',
            recipe_id: 'rec.rice',
            name: 'Cơm trắng',
            quantity: 180,
          },
        ],
        notes: [
          {
            code: 'SHOPPING_PRICE_UNAVAILABLE',
            message: 'Chưa có giá cho Cơm chín.',
          },
        ],
      },
    ].map((item) => {
      const row = state.rows[item.item_id] || { state: 'NEEDED' }
      const remaining = Math.max(
        0,
        item.quantity -
          (row.have_quantity || 0) -
          (row.purchased_quantity || 0),
      )
      return {
        ...item,
        ...row,
        remaining_quantity: remaining,
        notes: [
          ...item.notes,
          ...(row.state === 'PURCHASED' && remaining > 0
            ? [
                {
                  code: 'SHOPPING_NEED_MORE',
                  message: `Cần thêm ${remaining} g`,
                },
              ]
            : []),
        ],
      }
    })
    return {
      list_id: 'list-qa',
      plan_id: 'plan-qa',
      shopping_list_version: state.plan.plan_version,
      start_date: url?.searchParams.get('start_date') || state.shoppingRange?.start_date || state.plan.start_date,
      end_date: url?.searchParams.get('end_date') || state.shoppingRange?.end_date || state.plan.end_date,
      groups: [
        {
          food_group: 'GRAIN',
          items: excluded.includes('item-rice') ? [] : base,
        },
        ...(state.custom.length ? [{ items: state.custom }] : []),
      ],
      estimated_cost_vnd: 9137,
      estimated_remaining_cost_vnd: 5173,
      cost_coverage: 'PARTIAL',
      notes: [
        { code: 'SHOPPING_COST_INCOMPLETE', message: 'Chi phí chưa đầy đủ.' },
      ],
    }
  }
  await context.route('**/nutrition-fixture-image.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300"><rect width="480" height="300" fill="#eeedf2"/><path d="M170 140h140a70 70 0 0 1-140 0Z" fill="#ccc7d8"/><path d="M170 140h140M208 218h64" stroke="#91899f" stroke-width="8" stroke-linecap="round" fill="none"/></svg>',
    }),
  )
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace('/api/v1', ''),
      method = request.method()
    const key = `${method} ${path}`
    state.counts[key] = (state.counts[key] || 0) + 1
    const body = request.postData() ? request.postDataJSON() : null
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method))
      state.writes.push({ path, method, body })
    const ok = (data, status = 200) =>
      route.fulfill({ status, json: { data, meta: { request_id: 'qa' } } })
    const fail = (status, code, message, fields = {}) =>
      route.fulfill({
        status,
        json: { error: { code, message, fields, retryable: false } },
      })
    if (path === '/auth/me')
      return ok(
        state.accountB
          ? { ...user, id: 'nutrition-account-b', display_name: 'Tài khoản B' }
          : user,
      )
    if (path === '/users/me')
      return ok({
        ...user,
        id: state.accountB ? 'nutrition-account-b' : user.id,
        version: 1,
        email: 'qa@example.test',
      })
    if (path === '/users/me/preferences')
      return ok({
        timezone: 'Asia/Ho_Chi_Minh',
        theme: options.theme || 'light',
        version: 1,
      })
    if (path === '/notifications/unread-count') return ok({ count: 0 })
    if (path === '/notifications') return ok({ items: [], next_cursor: null })
    if (path === '/assistant/status') return ok({ available: false })
    if (path === '/assistant/preferences') return ok({})
    if (path === '/assistant/conversations') return ok({ items: [] })
    if (path === '/assistant/context') return ok({})
    if (path === '/me/nutrition-profile') {
      if (state.noPregnancy)
        return fail(
          404,
          'RESOURCE_NOT_FOUND',
          'Chưa có thai kỳ đang hoạt động.',
        )
      if (method === 'PUT') {
        // Match NutritionProfileService.apply: snack_count is only valid with SNACK.
        const updated = { ...state.profile, ...body }
        if (updated.snack_count != null && updated.meal_types.length && !updated.meal_types.includes('SNACK'))
          return fail(422, 'VALIDATION_ERROR', 'snack_count chỉ dùng được khi meal_types có SNACK.')
        Object.assign(state.profile, body)
        state.profile.profile_version++
        state.profile.needs_allergy_confirmation =
          state.profile.allergy_status === 'UNKNOWN'
        // Explicit scenario data, not an implementation of BE eligibility.
        if (state.revalidateOnSave) {
          const item = state.plan.days[0].slots[0].items[0]
          item.conflict = true
          item.reason_codes = [{ code: 'ALLERGEN_MATCH', message: 'Món có tôm, xung đột với dị ứng đã khai.' }]
          state.plan.lifecycle_state = 'NEEDS_UPDATE'
        }
      }
      return ok(
        method === 'PUT'
          ? {
              profile: state.profile,
              profile_version: state.profile.profile_version,
              items_to_revalidate: state.revalidateOnSave ? ['item-rice', 'item-other-plan', 'another-plan-item'] : [],
            }
          : state.profile,
      )
    }
    if (path === '/allergens') return ok([{ id: 'alg.shrimp', name: 'Tôm' }])
    if (path === '/diary') {
      const localDate = url.searchParams.get('date')
      const requestedByAccountB = state.accountB
      state.diaryDates.push(localDate)
      if (state.diaryFailDate === localDate)
        return fail(503, 'TEMPORARY', 'Chưa tải được nhật ký ngày này')
      const result = structuredClone(diaryView(localDate))
      if (state.diaryDelayDate === localDate)
        await new Promise((resolve) => setTimeout(resolve, 700))
      return ok(
        requestedByAccountB ? { ...diaryView(localDate), entries: [] } : result,
      )
    }
    if (path === '/diary-entries') {
      if (state.diaryRequests.has(body.request_id)) {
        const previous = state.diaryRequests.get(body.request_id)
        if (JSON.stringify(previous.body) !== JSON.stringify(body))
          return fail(409, 'IDEMPOTENCY_CONFLICT', 'Request id bound to another body', { request_id: body.request_id })
        return ok(diaryView(previous.entry.local_date))
      }
      const recipe = summaries.find((recipe) => recipe.id === body.recipe_id)
      const entry = {
        ...body,
        entry_id: `entry-${state.diaryEntries.length + 1}`,
        name: body.custom_text || recipe?.name || 'Cơm trắng',
        recipe_version: body.recipe_id ? 1 : null,
        nutrition: {},
        coverage: body.custom_text ? 'PARTIAL' : 'COMPLETE',
        created_at: new Date().toISOString(),
        notes: [],
      }
      delete entry.request_id
      state.diaryEntries.push(entry)
      state.diaryRequests.set(body.request_id, { body: structuredClone(body), entry })
      if (state.diaryRetryOnce) {
        state.diaryRetryOnce = false
        return route.abort('failed')
      }
      return ok(diaryView(body.local_date), 201)
    }
    if (path.startsWith('/diary-entries/')) {
      const entry = state.diaryEntries.find(
        (entry) => entry.entry_id === path.split('/').at(-1),
      )
      assert.ok(entry)
      const sourceDate = entry.local_date
      if (method === 'DELETE')
        state.diaryEntries = state.diaryEntries.filter(
          (other) => other !== entry,
        )
      else {
        Object.assign(entry, body)
        if (body.recipe_id) {
          entry.name = summaries.find(
            (recipe) => recipe.id === body.recipe_id,
          ).name
          entry.recipe_version = 2
          entry.source_plan_item_id = null
        }
        if (body.custom_text) entry.name = body.custom_text
      }
      return ok(diaryView(method === 'DELETE' ? sourceDate : entry.local_date))
    }
    if (path === '/meal-feedback')
      return ok({
        feedback_id: 'feedback-qa',
        ...body,
        created_at: '2026-10-19T00:00:00Z',
        expires_at: body.type === 'HARD_NOW' ? '2026-10-26T00:00:00Z' : null,
        notes: [],
      })
    if (path === '/ingredients')
      return ok([
        {
          id: 'ing.fish',
          canonical_name: 'Cá',
          food_group: 'MEAT_FISH_EGG',
          allergen_status: 'KNOWN',
        },
      ])
    if (path === '/recommendations')
      return ok({
        profile_version: state.profile.profile_version,
        allergy_checked: state.profile.allergy_status !== 'UNKNOWN',
        notes: [],
        meals: [
          {
            meal_type: 'LUNCH',
            status: 'READY',
            notes: [],
            items: summaries.map((item) => ({
              recipe_id: item.id,
              name: item.name,
              minutes: item.minutes,
              role: item.role,
              nutrition_status: 'PARTIAL',
              reasons: [
                { code: 'QUICK_TO_COOK', message: 'Thời gian theo công thức' },
              ],
            })),
          },
        ],
      })
    if (state.realCatalog && path.startsWith('/recipes'))
      return route.continue()
    if (path === '/recipes') {
      state.catalogQuery = url.searchParams.toString()
      return ok({
        items: url.searchParams.get('cursor')
          ? summaries.slice(1)
          : summaries.slice(0, 1),
        has_more: !url.searchParams.get('cursor'),
        next_cursor: url.searchParams.get('cursor') ? null : 'rec.rice',
      })
    }
    if (path.startsWith('/recipes/')) {
      const summary =
        summaries.find(
          (item) => item.id === decodeURIComponent(path.split('/').at(-1)),
        ) || summaries[0]
      return ok({
        summary,
        steps:
          '1. Rửa sạch nguyên liệu.\n2. Nấu chín hoàn toàn.\n3. Chia phần và dùng khi ấm.',
        safety_notes: 'Nấu chín hoàn toàn trước khi dùng.',
        ingredients: [
          {
            ingredient_id: 'ing.rice',
            canonical_name: 'Gạo tẻ',
            quantity_gram: 300,
            preparation_state: 'RAW',
            food_group: 'GRAIN',
            allergen_status: 'KNOWN',
            allergen_ids: [],
          },
        ],
        data_state: {
          nutrient_codes_missing_data: ['IODINE'],
          ingredients_with_unknown_allergen: [],
          price_known_for_all_ingredients: false,
        },
      })
    }
    if (path === '/meal-plans/preview') {
      state.previewBodies.push(body)
      if (state.upgradeRequired)
        return fail(
          403,
          'PLAN_UPGRADE_REQUIRED',
          'Máy chủ yêu cầu gói cho lượt tạo này.',
          { required_plan: 'PLUS', feature: 'PERSONALISED_GUIDANCE' },
        )
      if (state.retryOnce && state.previewBodies.length === 1)
        return route.abort('failed')
      if (state.previewValidation)
        return fail(422, 'VALIDATION_ERROR', 'Thông tin chưa hợp lệ', {
          meal_types: 'Chọn ít nhất một bữa',
        })
      state.plan = planFor(state.profile)
      expandPlan(state.plan, body.day_count, body.start_date)
      const preview = {
        preview_id: 'preview-qa',
        status: state.noMatch ? 'NO_MATCH' : 'READY_WITH_NOTES',
        profile_version: state.profile.profile_version,
        nutrition_coverage: 'PARTIAL',
        expires_at: new Date(
          Date.now() + (state.shortExpiry ? 1000 : 1800000),
        ).toISOString(),
        notes: state.budgetNoMatch
          ? [
              {
                code: 'STRICT_BUDGET_WITHOUT_PRICE',
                message: 'STRICT_BUDGET_WITHOUT_PRICE: 8 món',
              },
            ]
          : [],
        days: structuredClone(state.plan.days),
      }
      preview.days.forEach((day) =>
        day.slots.forEach((slot) =>
          slot.items.forEach((item) => delete item.item_id),
        ),
      )
      if (state.noMatch) {
        preview.days[0].slots[0].filled = false
        preview.days[0].slots[0].items = []
        preview.days[0].slots[0].reason_codes = [
          {
            code: 'ROLE_NO_CANDIDATE',
            message:
              'Bữa trưa · tinh bột: không còn món trong thời gian đã chọn.',
          },
        ]
      }
      return ok(preview)
    }
    if (path === '/meal-plans' && method === 'POST') {
      if (state.saveConflict)
        return fail(409, 'VERSION_CONFLICT', 'Bản xem trước đã hết hạn.')
      return ok(state.plan, 201)
    }
    if (path === '/meal-plans/plan-qa')
      return state.accountB
        ? fail(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy')
        : ok(state.plan)
    if (path.endsWith('/alternatives'))
      return ok({
        item_id: 'item-rice',
        role: 'STAPLE',
        current_servings: state.plan.days[0].slots[0].items[0].servings,
        serving_options: [0.75, 1, 1.25, 1.75],
        alternatives: [
          {
            recipe_id: 'rec.rice2',
            recipe_version: 2,
            name: 'Cơm gạo lứt',
            minutes: 30,
            delta_cost_vnd: null,
            delta_minutes: 5,
          },
        ],
        notes: [],
      })
    if (
      path === '/meal-plans/plan-qa/items/item-rice' ||
      path.endsWith('/regenerate') ||
      path.endsWith('/undo')
    ) {
      if (state.conflictOnce) {
        state.conflictOnce = false
        state.plan.plan_version++
        if (state.conflictProfileVersion) state.profile.profile_version++
        return fail(409, 'VERSION_CONFLICT', 'Changed elsewhere')
      }
      assert.equal(body.expected_plan_version, state.plan.plan_version)
      assert.equal(body.expected_profile_version, state.profile.profile_version)
      const item = state.plan.days[0].slots[0].items[0]
      const notes = []
      if (path.endsWith('/regenerate')) {
        const heldConflict = state.plan.days.flatMap((day) => day.slots.flatMap((slot) => slot.items)).find((item) => item.locked && item.conflict)
        if (heldConflict) return fail(422, 'RECIPE_NOT_ELIGIBLE', 'Locked item is not eligible', { item_id: heldConflict.item_id })
        for (const day of state.plan.days) for (const slot of day.slots) {
          // Fixtures model the contract at meal/date level, including custom/off-plan diary.
          if (state.diaryEntries.some((entry) => entry.local_date === day.local_date && entry.meal_type === slot.meal_type)) {
            notes.push({ code: 'PLAN_KEPT_EATEN_MEAL', message: 'Kept eaten meal' })
            continue
          }
          slot.items.forEach((row) => {
            if (!row.locked) Object.assign(row, { recipe_id: 'rec.rice2', recipe_version: 2, name: 'Cơm gạo lứt', conflict: false, reason_codes: [] })
          })
        }
      }
      if (method === 'PATCH') {
        if (body.recipe_id)
          Object.assign(item, {
            recipe_id: body.recipe_id,
            recipe_version: body.recipe_version,
            name: 'Cơm gạo lứt',
            conflict: false,
            reason_codes: [],
          })
        if (body.locked != null) item.locked = body.locked
        if (body.servings != null) item.servings = body.servings
        if (body.grams != null) {
          assert.equal('servings' in body, false)
          item.servings = body.grams / item.serving_gram
        }
      }
      state.plan.plan_version++
      state.plan.lifecycle_state = state.plan.days.some((day) => day.slots.some((slot) => slot.items.some((item) => item.conflict))) ? 'NEEDS_UPDATE' : 'SAVED'
      state.plan.days[0].nutrition.ENERGY.known_value = 777.7
      return ok({
        plan: state.plan,
        changed: true,
        shopping_list_version: state.plan.plan_version,
        undo_available: !path.endsWith('/undo'),
        notes,
      })
    }
    if (path === '/meal-plans/plan-qa/shopping-list') {
      // BE stores a separate list per date range; item mutations return that list's range.
      state.shoppingRange = {
        start_date: url.searchParams.get('start_date') || state.plan.start_date,
        end_date: url.searchParams.get('end_date') || state.plan.end_date,
      }
      state.shoppingQuery = url.searchParams.toString()
      return ok(shopping(url))
    }
    if (path === '/meal-plans/plan-qa/shopping-list/items') {
      state.custom.push({
        item_id: 'custom-qa',
        name: body.text,
        custom_text: body.text,
        quantity: body.quantity,
        unit: body.unit,
        state: 'NEEDED',
        used_by: [],
        notes: [
          {
            code: 'SHOPPING_CUSTOM_LINE',
            message: 'Không ảnh hưởng dinh dưỡng.',
          },
        ],
      })
      return ok(shopping(), 201)
    }
    if (path.startsWith('/shopping-list-items/')) {
      const itemId = path.split('/').at(-1)
      if (method === 'DELETE') {
        assert.equal(itemId, 'custom-qa')
        state.custom = []
      } else if (itemId === 'custom-qa') {
        Object.assign(state.custom[0], body)
        if (body.custom_text) state.custom[0].name = body.custom_text
      } else {
        const row = (state.rows[itemId] ||= { state: 'NEEDED' })
        Object.assign(row, body)
        if (body.state === 'PURCHASED')
          row.purchased_quantity = state.plan.plan_version > 1 ? 300 : 100
        if (body.state === 'HAVE') row.have_quantity = 100
        if (body.state === 'NEEDED') {
          delete row.purchased_quantity
          delete row.have_quantity
        }
      }
      return ok(shopping())
    }
    unexpected.push(key)
    return fail(500, 'UNMOCKED', `Unexpected ${key}`)
  })
  const page = await context.newPage()
  const activeReads = new Set()
  page.on('request', (request) => {
    if (/\/api\/v1\/(me\/nutrition-profile|meal-plans|diary|recipes|allergens|ingredients|recommendations)(\/|\?|$)/.test(request.url()) &&
      (request.method() === 'GET' || request.url().endsWith('/recommendations'))) {
      activeReads.add(request)
      state.maxConcurrentReads = Math.max(state.maxConcurrentReads, activeReads.size)
    }
  })
  page.on('requestfinished', (request) => activeReads.delete(request))
  page.on('requestfailed', (request) => activeReads.delete(request))
  page.setDefaultTimeout(10000)
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !message.text().includes('Failed to load resource') &&
      !message.text().includes('NutriMom diagnostic')
    )
      consoleErrors.push(message.text())
  })
  return {
    page,
    context,
    state,
    goto: (path) => page.goto(`http://127.0.0.1:${port}${path}`),
  }
}
async function check(name, run) {
  if (
    process.env.NUTRITION_QA_FILTER &&
    !name.includes(process.env.NUTRITION_QA_FILTER)
  )
    return
  try {
    await run()
    passed.push(name)
    console.log(`PASS ${name}`)
  } catch (error) {
    for (const context of browser.contexts())
      for (const page of context.pages()) {
        await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
        console.log(page.url())
        console.log((await page.locator('body').innerText()).slice(-6500))
      }
    throw error
  }
}
const visible = async (locator) => {
  await locator.waitFor({ state: 'visible' })
}
const button = (page, name) => page.getByRole('button', { name, exact: true })
async function chooseSelect(page, label, option) {
  await button(page, label).click()
  await chooseSelectAfterOpen(page, label, option)
}
async function chooseSelectAfterOpen(page, label, option) {
  await page.getByRole('option', { name: option, exact: true }).click()
  await page
    .getByRole('listbox', { name: label, exact: true })
    .waitFor({ state: 'hidden' })
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    'Page must not overflow horizontally',
  )
}
async function openEditor(page) {
  await page
    .getByRole('button', { name: 'Đổi món / khẩu phần' })
    .first()
    .click()
  await visible(page.getByRole('dialog'))
  await visible(button(page, 'Cập nhật khẩu phần'))
  const recipeLink = page
    .getByRole('dialog')
    .getByRole('link', { name: 'Xem công thức', exact: true })
    .first()
  if (await recipeLink.count())
    assert.ok((await recipeLink.getAttribute('href')).includes(`date=${date}`))
}
export {
  assert,
  browser,
  server,
  output,
  passed,
  unexpected,
  pageErrors,
  consoleErrors,
  fixture,
  check,
  visible,
  button,
  chooseSelect,
  chooseSelectAfterOpen,
  noOverflow,
  openEditor,
  date,
  baseProfile,
  planFor,
  expandPlan,
  writeFile,
}
