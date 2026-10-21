import {
  assert, browser, server, output, passed, unexpected, pageErrors, consoleErrors,
  fixture, check, visible, button, noOverflow, openEditor, date, writeFile,
} from './helpers/nutrition-browser.mjs'

const measurements = []
const planUrl = `/app/nutrition?tab=plan&date=${date}&plan=plan-qa`
const editor = (f) => button(f.page, 'Đổi món / khẩu phần')
async function openProfile(f, group) {
  await f.page.locator('.nutrition-profile-menu > summary').click()
  await button(f.page, group).click()
  await visible(f.page.getByRole('dialog', { name: 'Hồ sơ ăn uống' }))
}
async function saveBudget(f) {
  await openProfile(f, 'Sinh hoạt')
  await f.page.getByLabel('Ngân sách mỗi ngày', { exact: true }).fill('150000')
  await button(f.page, 'Lưu thay đổi').click()
  await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
}
async function saveAllergy(f) {
  await openProfile(f, 'Dị ứng')
  await f.page.getByRole('radio', { name: 'Có dị ứng đã biết', exact: true }).check()
  await button(f.page, 'Tôm').click()
  await button(f.page, 'Lưu thay đổi').click()
  await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
}
async function ready(f) {
  await f.goto(planUrl)
  await visible(editor(f).first())
  await f.page.waitForFunction(() => !document.querySelector('.nutrition-item-actions button[disabled]'))
}
async function tools(f) { await f.page.locator('.nutrition-plan-tools > summary').click() }
async function finishedEdit(f) {
  await visible(f.page.getByText(/Đã cập nhật thực đơn và số liệu dự kiến/))
}
function record(name, f) { measurements.push({ name, counts: structuredClone(f.state.counts), writes: structuredClone(f.state.writes), maxConcurrentReads: f.state.maxConcurrentReads }) }

try {
  await check('revalidation soft save refreshes only open plan; apply requires confirmation and latest versions', async () => {
    const f = await fixture({ known: true })
    await ready(f)
    const original = structuredClone(f.state.plan.days)
    await saveBudget(f)
    await visible(f.page.getByText('Hồ sơ đã được cập nhật', { exact: true }))
    await f.page.waitForFunction(() => !document.querySelector('.nutrition-item-actions button[disabled]'))
    assert.equal(await editor(f).isEnabled(), true)
    assert.deepEqual(f.state.plan.days, original)
    assert.equal(f.state.counts['GET /me/nutrition-profile'], 1)
    assert.equal(f.state.counts['GET /meal-plans/plan-qa'], 2)
    assert.equal(f.state.counts['GET /diary'] || 0, 0)
    assert.equal(f.state.counts['POST /meal-plans/plan-qa/regenerate'] || 0, 0)
    await openEditor(f.page)
    await f.page.keyboard.press('Escape')
    await button(f.page, 'Áp dụng cho thực đơn hiện tại').click()
    await visible(f.page.getByRole('dialog', { name: 'Áp dụng hồ sơ mới' }))
    assert.equal(f.state.counts['POST /meal-plans/plan-qa/regenerate'] || 0, 0)
    await button(f.page, 'Hủy').click()
    assert.equal(f.state.counts['POST /meal-plans/plan-qa/regenerate'] || 0, 0)
    await button(f.page, 'Áp dụng cho thực đơn hiện tại').click()
    await button(f.page, 'Xác nhận áp dụng').evaluate((node) => { node.click(); node.click() })
    await finishedEdit(f)
    assert.equal(f.state.counts['POST /meal-plans/plan-qa/regenerate'], 1)
    assert.equal(f.state.plan.profile_version, 2, 'BE retains the profile version at plan creation even after regenerate')
    const body = f.state.writes.find((write) => write.path.endsWith('/regenerate')).body
    assert.equal(body.expected_plan_version, 1)
    assert.equal(body.expected_profile_version, 3)
    assert.equal(f.state.profile.daily_budget_vnd, 150000)
    assert.equal(await button(f.page, 'Áp dụng cho thực đơn hiện tại').count(), 0)
    record('soft-save-and-confirmed-apply', f)
    await f.context.close()
  })

  await check('revalidation hard save counts current plan only; held conflict can be replaced and returns SAVED', async () => {
    const f = await fixture({ known: true, revalidateOnSave: true })
    f.state.plan.days[0].slots[0].items[0].locked = true
    await ready(f)
    await saveAllergy(f)
    await visible(f.page.getByText('Cần đổi', { exact: true }))
    await visible(f.page.getByText('Đang giữ', { exact: true }))
    await visible(f.page.getByText(/1 món trong thực đơn này cần xem lại/))
    await visible(f.page.getByText('Món có tôm, xung đột với dị ứng đã khai.'))
    assert.equal(f.state.counts['GET /me/nutrition-profile'], 1)
    assert.equal(f.state.counts['GET /meal-plans/plan-qa'], 2)
    assert.equal(f.state.writes.filter((write) => write.method === 'PATCH').length, 0)
    await f.page.screenshot({ path: `${output}/held-conflict-desktop-light.png`, fullPage: true })
    await openEditor(f.page)
    await button(f.page, 'Thay món này').click()
    await finishedEdit(f)
    assert.equal(f.state.plan.lifecycle_state, 'SAVED')
    assert.equal(f.state.plan.days[0].slots[0].items[0].locked, true)
    assert.equal(await f.page.getByText('Cần đổi', { exact: true }).count(), 0)
    assert.equal(f.state.counts['GET /meal-plans/plan-qa'], 2, 'Use mutation response without redundant plan GET')
    assert.equal(f.state.counts['POST /diary-entries'] || 0, 0)
    record('hard-save-and-held-replacement', f)
    await f.context.close()
  })

  await check('revalidation 422 identifies held card; explicit unlock and confirmed regenerate resolve conflict', async () => {
    const f = await fixture({ known: true, revalidateOnSave: true })
    f.state.plan.days[0].slots[0].items[0].locked = true
    await ready(f)
    await saveAllergy(f)
    await visible(f.page.getByText('Cần đổi', { exact: true }))
    await button(f.page, 'Áp dụng cho thực đơn hiện tại').click()
    await button(f.page, 'Xác nhận áp dụng').click()
    await visible(f.page.locator('[data-item-id="item-rice"]').getByRole('alert'))
    assert.equal(f.state.plan.days[0].slots[0].items[0].locked, true)
    assert.equal(f.state.counts['PATCH /meal-plans/plan-qa/items/item-rice'] || 0, 0)
    await button(f.page, 'Bỏ giữ Cơm trắng').click()
    await finishedEdit(f)
    assert.equal(f.state.plan.days[0].slots[0].items[0].conflict, true)
    assert.equal(f.state.plan.lifecycle_state, 'NEEDS_UPDATE')
    await button(f.page, 'Áp dụng cho thực đơn hiện tại').click()
    await button(f.page, 'Xác nhận áp dụng').click()
    await visible(f.page.getByRole('heading', { name: 'Cơm gạo lứt', exact: true }))
    assert.equal(f.state.plan.lifecycle_state, 'SAVED')
    assert.equal(f.state.writes.at(-1).body.expected_plan_version, 2)
    assert.equal(f.state.writes.at(-1).body.expected_profile_version, 3)
    assert.equal(f.state.profile.allergen_ids[0], 'alg.shrimp')
    record('422-explicit-unlock-and-regenerate', f)
    await f.context.close()
  })

  await check('revalidation failed refresh retains cards, blocks stale writes and retries only on request', async () => {
    const f = await fixture({ known: true, revalidateOnSave: true })
    await ready(f)
    let refreshes = 0
    let failed = true
    await f.context.route('**/api/v1/meal-plans/plan-qa', async (route) => {
      refreshes++
      await new Promise((resolve) => setTimeout(resolve, 350))
      if (failed) return route.fulfill({ status: 503, json: { error: { code: 'TEMPORARY', message: 'Chưa tải được thực đơn.' } } })
      await route.fallback()
    })
    await saveAllergy(f)
    await visible(f.page.getByRole('heading', { name: 'Cơm trắng', exact: true }))
    assert.equal(await editor(f).isDisabled(), true)
    await visible(f.page.getByRole('alert'))
    assert.equal(await editor(f).isDisabled(), true)
    assert.equal(refreshes, 1)
    assert.equal(f.state.writes.filter((write) => write.method === 'PATCH').length, 0)
    failed = false
    await button(f.page, 'Thử lại').click()
    await visible(f.page.getByText('Cần đổi', { exact: true }))
    assert.equal(await editor(f).isEnabled(), true)
    assert.equal(refreshes, 2)
    record('profile-refresh-failure-manual-retry', f)
    await f.context.close()
  })

  await check('revalidation seven-day regenerate preserves custom and off-plan eaten slots without diary GETs', async () => {
    const f = await fixture({ known: true, dayCount: 7 })
    f.state.diaryEntries = [
      { entry_id: 'custom', local_date: date, meal_type: 'LUNCH', name: 'Cháo tự nấu', custom_text: 'Cháo tự nấu', amount_text: 'Một bát', coverage: 'PARTIAL', nutrition: {}, notes: [] },
      { entry_id: 'offplan', local_date: '2026-10-19', meal_type: 'LUNCH', name: 'Món khác', recipe_id: 'rec.soup', recipe_version: 1, servings: 1, coverage: 'PARTIAL', nutrition: { ENERGY: { known_value: 99, unit: 'kcal', coverage: 'PARTIAL' } }, notes: [] },
    ]
    const diary = structuredClone(f.state.diaryEntries)
    const eaten = structuredClone(f.state.plan.days.slice(0, 2).map((day) => day.slots))
    await ready(f)
    await tools(f)
    await button(f.page, 'Tạo lại món chưa giữ').click()
    assert.equal(f.state.counts['GET /diary'] || 0, 0)
    assert.equal(f.state.counts['POST /meal-plans/plan-qa/regenerate'] || 0, 0)
    await button(f.page, 'Xác nhận tạo lại').evaluate((node) => { node.click(); node.click() })
    await visible(f.page.getByText('Các bữa đã ghi nhật ký được giữ nguyên khi tạo lại thực đơn.'))
    assert.equal(f.state.counts['GET /diary'] || 0, 0)
    assert.equal(f.state.counts['POST /meal-plans/plan-qa/regenerate'], 1)
    assert.deepEqual(f.state.diaryEntries, diary)
    assert.deepEqual(f.state.plan.days.slice(0, 2).map((day) => day.slots), eaten)
    assert.equal(f.state.plan.days[2].slots[0].items[0].recipe_id, 'rec.rice2')
    assert.equal(f.state.counts['POST /diary-entries'] || 0, 0)
    record('seven-days-custom-offplan-preservation', f)
    await f.context.close()
  })

  await check('revalidation version conflict reloads profile and plan once without replaying mutation', async () => {
    const f = await fixture({ known: true, conflictOnce: true, conflictProfileVersion: true })
    await ready(f)
    await openEditor(f.page)
    await button(f.page, 'Thay món này').click()
    await visible(f.page.getByText(/Dữ liệu đã thay đổi. Đã yêu cầu tải lại/))
    await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
    await f.page.waitForFunction(() => !document.querySelector('.nutrition-item-actions button[disabled]'))
    assert.equal(f.state.counts['PATCH /meal-plans/plan-qa/items/item-rice'], 1)
    assert.equal(f.state.counts['GET /me/nutrition-profile'], 2)
    assert.equal(f.state.counts['GET /meal-plans/plan-qa'], 2)
    assert.equal(f.state.plan.days[0].slots[0].items[0].recipe_id, 'rec.rice')
    await openEditor(f.page)
    await button(f.page, 'Thay món này').click()
    await finishedEdit(f)
    assert.equal(f.state.writes.at(-1).body.expected_plan_version, 2)
    assert.equal(f.state.writes.at(-1).body.expected_profile_version, 3)
    record('version-conflict-explicit-reselection', f)
    await f.context.close()
  })

  await check('revalidation preview idempotency conflict preserves choices and starts fresh intent without recovery GET', async () => {
    const f = await fixture()
    const bodies = []
    await f.context.route('**/api/v1/meal-plans/preview', async (route) => {
      bodies.push(route.request().postDataJSON())
      if (bodies.length === 1) return route.fulfill({ status: 409, json: { error: { code: 'IDEMPOTENCY_CONFLICT', message: 'Different body', fields: { request_id: 'old' }, retryable: true } } })
      await route.fallback()
    })
    await f.goto(`/app/nutrition?tab=plan&date=${date}`)
    await button(f.page, '3 ngày').click()
    await button(f.page, 'Tiếp tục chọn ưu tiên').click()
    await button(f.page, 'Tạo bản xem trước').click()
    await visible(f.page.getByText(/Mã của lần gửi này đã gắn với nội dung khác/))
    assert.equal(await button(f.page, 'Thử lại yêu cầu vừa gửi').count(), 0)
    assert.equal(f.state.counts['GET /me/nutrition-profile'], 1)
    assert.equal(bodies.length, 1)
    await button(f.page, 'Tạo bản xem trước').click()
    await visible(button(f.page, 'Lưu và tùy chỉnh'))
    assert.notEqual(bodies[0].request_id, bodies[1].request_id)
    assert.equal(bodies[1].day_count, 3)
    assert.equal(bodies[1].constraints.daily_budget_vnd, 120000)
    measurements.push({ name: 'preview-idempotency-conflict', bodies })
    await f.context.close()
  })

  await check('revalidation diary idempotency conflict keeps form and uses a new id only after explicit confirmation', async () => {
    const f = await fixture({ known: true })
    const bodies = []
    await f.context.route('**/api/v1/diary-entries', async (route) => {
      bodies.push(route.request().postDataJSON())
      if (bodies.length === 1) return route.fulfill({ status: 409, json: { error: { code: 'IDEMPOTENCY_CONFLICT', message: 'Different body', fields: { request_id: 'old' }, retryable: true } } })
      await route.fallback()
    })
    await ready(f)
    await button(f.page, 'Ghi đã ăn').click()
    await f.page.getByLabel('Số phần đã ăn', { exact: true }).fill('0.75')
    await button(f.page, 'Xác nhận ghi nhật ký').click()
    await visible(f.page.getByText(/Mã của lần gửi này đã gắn với nội dung khác/))
    assert.equal(bodies.length, 1)
    assert.equal(f.state.diaryEntries.length, 0)
    assert.equal(await f.page.getByLabel('Số phần đã ăn', { exact: true }).inputValue(), '0.75')
    assert.equal(await button(f.page, 'Thử lại lần ghi này').count(), 0)
    await button(f.page, 'Xác nhận ghi nhật ký').click()
    await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.notEqual(bodies[0].request_id, bodies[1].request_id)
    assert.equal(bodies[1].servings, 0.75)
    assert.equal(f.state.diaryEntries.length, 1)
    measurements.push({ name: 'diary-idempotency-conflict', bodies })
    await f.context.close()
  })

  await check('revalidation late mutation cannot navigate back from another tab', async () => {
    const f = await fixture({ known: true })
    await ready(f)
    let release
    const gate = new Promise((resolve) => { release = resolve })
    await f.context.route('**/api/v1/meal-plans/plan-qa/items/item-rice', async (route) => { await gate; await route.fallback() })
    const request = f.page.waitForRequest((r) => r.method() === 'PATCH')
    await button(f.page, 'Giữ món Cơm trắng').click()
    await request
    await f.page.getByRole('link', { name: 'Khám phá', exact: true }).click()
    await visible(f.page.getByRole('heading', { name: 'Khám phá món ăn' }))
    const response = f.page.waitForResponse((r) => r.request().method() === 'PATCH')
    release()
    await response
    await f.page.waitForTimeout(150)
    assert.ok(f.page.url().includes('tab=explore'))
    assert.equal(await f.page.locator('.nutrition-plan-item').count(), 0)
    assert.equal(f.state.counts['PATCH /meal-plans/plan-qa/items/item-rice'], 1)
    record('late-mutation-navigation', f)
    await f.context.close()
  })

  await check('revalidation late plan refresh cannot overwrite a newly opened plan', async () => {
    const f = await fixture({ known: true, revalidateOnSave: true })
    await ready(f)
    let release
    const gate = new Promise((resolve) => { release = resolve })
    await f.context.route('**/api/v1/meal-plans/plan-qa', async (route) => { await gate; await route.fallback() })
    const another = structuredClone(f.state.plan)
    another.plan_id = 'plan-other'
    another.days[0].slots[0].items[0].name = 'Thực đơn khác'
    await f.context.route('**/api/v1/meal-plans/plan-other', (route) => route.fulfill({ json: { data: another } }))
    const refresh = f.page.waitForRequest((r) => r.url().endsWith('/meal-plans/plan-qa'))
    await saveAllergy(f)
    await refresh
    // Native history navigation keeps the React account alive, unlike page.goto.
    await f.page.evaluate((url) => { history.pushState({}, '', url); dispatchEvent(new PopStateEvent('popstate')) }, planUrl.replace('plan-qa', 'plan-other'))
    await visible(f.page.getByRole('heading', { name: 'Thực đơn khác', exact: true }))
    const response = f.page.waitForResponse((r) => r.url().endsWith('/meal-plans/plan-qa'))
    release()
    await response
    await f.page.waitForTimeout(150)
    assert.equal(await f.page.getByRole('heading', { name: 'Thực đơn khác', exact: true }).count(), 1)
    assert.equal(await f.page.getByText('Cần đổi', { exact: true }).count(), 0)
    assert.ok(f.page.url().includes('plan-other'))
    record('late-plan-refresh-navigation', f)
    await f.context.close()
  })

  await check('revalidation mobile desktop light dark conflict and dialog preserve shell and keyboard', async () => {
    for (const theme of ['light', 'dark']) for (const width of [360, 390, 1440]) {
      const f = await fixture({ known: true, revalidateOnSave: true, theme })
      f.state.plan.days[0].slots[0].items[0].locked = true
      await f.page.setViewportSize({ width, height: 1000 })
      await ready(f)
      await saveAllergy(f)
      await visible(f.page.getByText('Cần đổi', { exact: true }))
      await noOverflow(f.page)
      assert.equal(await f.page.locator('.nutrition-tabs a').count(), 4)
      assert.equal(await f.page.locator('.nutrition-banner__image').getAttribute('src'), '/bannerDD.png')
      await f.page.screenshot({ path: `${output}/conflict-${width}-${theme}.png`, fullPage: true })
      await button(f.page, 'Áp dụng cho thực đơn hiện tại').click()
      await visible(f.page.getByRole('dialog', { name: 'Áp dụng hồ sơ mới' }))
      await noOverflow(f.page)
      await f.page.screenshot({ path: `${output}/apply-dialog-${width}-${theme}.png`, fullPage: true })
      await f.page.keyboard.press('Tab')
      assert.equal(await f.page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))), true)
      await f.page.keyboard.press('Escape')
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      assert.equal(f.state.counts['POST /meal-plans/plan-qa/regenerate'] || 0, 0)
      await f.context.close()
    }
  })

  await check('revalidation soft-profile portion lock and undo keep latest expected versions', async () => {
    const f = await fixture({ known: true })
    await ready(f)
    await saveBudget(f)
    await visible(f.page.getByText('Hồ sơ đã được cập nhật', { exact: true }))
    await openEditor(f.page)
    await f.page.getByLabel('Số phần', { exact: true }).fill('1.25')
    await button(f.page, 'Cập nhật khẩu phần').click()
    await finishedEdit(f)
    await button(f.page, 'Giữ món Cơm trắng').click()
    await visible(button(f.page, 'Bỏ giữ Cơm trắng'))
    await tools(f)
    await button(f.page, 'Hoàn tác thao tác gần nhất').click()
    await f.page.waitForFunction(() => !document.querySelector('.nutrition-item-actions button[disabled]'))
    const writes = f.state.writes.filter((write) => write.path.includes('/meal-plans/'))
    assert.deepEqual(writes.map((write) => write.body.expected_profile_version), [3, 3, 3])
    assert.deepEqual(writes.map((write) => write.body.expected_plan_version), [1, 2, 3])
    assert.equal(f.state.counts['GET /meal-plans/plan-qa'], 2)
    record('soft-change-portion-lock-undo', f)
    await f.context.close()
  })

  await check('revalidation regenerate 429 cooldown prevents duplicate writes and expiry does not auto-retry', async () => {
    const f = await fixture({ known: true })
    let posts = 0
    await f.context.route('**/api/v1/meal-plans/plan-qa/regenerate', async (route) => {
      posts++
      if (posts === 1) return route.fulfill({ status: 429, headers: { 'Retry-After': '1' }, json: { error: { code: 'RATE_LIMITED', message: 'Wait', fields: {} } } })
      await route.fallback()
    })
    await ready(f)
    await tools(f)
    await button(f.page, 'Tạo lại món chưa giữ').click()
    await button(f.page, 'Xác nhận tạo lại').evaluate((node) => { node.click(); node.click() })
    await visible(f.page.getByText('Bạn đang thao tác hơi nhanh', { exact: true }))
    assert.equal(await button(f.page, 'Tạo lại món chưa giữ').isDisabled(), true)
    await button(f.page, 'Tạo lại món chưa giữ').evaluate((node) => { node.click(); node.click() })
    assert.equal(posts, 1)
    await f.page.waitForTimeout(1400)
    assert.equal(posts, 1, 'Cooldown expiration must not replay a mutation')
    await button(f.page, 'Tạo lại món chưa giữ').click()
    await button(f.page, 'Xác nhận tạo lại').click()
    await finishedEdit(f)
    assert.equal(posts, 2)
    measurements.push({ name: 'regenerate-429-explicit-retry', posts })
    await f.context.close()
  })

  await check('revalidation 422 on another day links to the exact conflicting card', async () => {
    const f = await fixture({ known: true, dayCount: 7 })
    const item = f.state.plan.days[5].slots[0].items[0]
    Object.assign(item, { locked: true, conflict: true, reason_codes: [{ code: 'HARD_EXCLUSION', message: 'Món có thành phần cần tránh.' }] })
    f.state.plan.lifecycle_state = 'NEEDS_UPDATE'
    await ready(f)
    await tools(f)
    await button(f.page, 'Tạo lại món chưa giữ').click()
    await button(f.page, 'Xác nhận tạo lại').click()
    await button(f.page, 'Xem món cần đổi ngày 23/10/2026').click()
    await visible(f.page.locator('[data-item-id="item-rice-5"]').getByRole('alert'))
    assert.equal(f.state.counts['GET /diary'] || 0, 0)
    assert.equal(f.state.counts['GET /meal-plans/plan-qa'], 1)
    assert.equal(f.state.writes.filter((write) => write.method === 'PATCH').length, 0)
    record('422-other-day-card', f)
    await f.context.close()
  })

  await check('revalidation today retains loaded meals after refresh failure and blocks stale diary seeds', async () => {
    const f = await fixture({ known: true, revalidateOnSave: true })
    await f.goto(`/app/nutrition?date=${date}`)
    await visible(f.page.getByRole('heading', { name: 'Những bữa ăn của bạn' }))
    let failed = true
    await f.context.route('**/api/v1/meal-plans/plan-qa', async (route) => {
      if (failed) return route.fulfill({ status: 503, json: { error: { code: 'TEMPORARY', message: 'Chưa tải được thực đơn.' } } })
      await route.fallback()
    })
    await saveAllergy(f)
    await visible(f.page.getByRole('alert'))
    await visible(f.page.getByRole('heading', { name: 'Những bữa ăn của bạn' }))
    assert.equal(await button(f.page, 'Ghi đã ăn').isDisabled(), true)
    assert.equal(f.state.counts['POST /diary-entries'] || 0, 0)
    failed = false
    await button(f.page, 'Thử lại').click()
    await visible(f.page.getByText('Cần đổi', { exact: true }))
    assert.equal(await button(f.page, 'Ghi đã ăn').isEnabled(), true)
    record('today-refresh-error-preserved-content', f)
    await f.context.close()
  })

  assert.deepEqual(unexpected, [])
  assert.deepEqual(pageErrors, [])
  assert.deepEqual(consoleErrors, [])
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ passed, measurements, unexpected, pageErrors, consoleErrors, browser: browser.version(), mode: process.env.NUTRITION_QA_MODE || 'development/StrictMode', integration: 'BE contract fixtures; no live FE–BE mutation validation.' }, null, 2))
  await browser.close()
  await server.close()
}
