import {
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
  noOverflow,
  openEditor,
  date,
  writeFile,
} from './helpers/nutrition-browser.mjs'

const tab = (page, name) =>
  page
    .getByRole('navigation', { name: 'Điều hướng dinh dưỡng' })
    .getByRole('link', { name, exact: true })
async function priorities(page, count = 1) {
  await button(page, count === 7 ? '7 ngày · Cả tuần' : `${count} ngày`).click()
  await button(page, 'Tiếp tục chọn ưu tiên').click()
  await visible(button(page, 'Tạo bản xem trước'))
}
async function preview(page) {
  await button(page, 'Tạo bản xem trước').click()
  await visible(button(page, 'Lưu và tùy chỉnh'))
}
async function tools(page) {
  await page.locator('.nutrition-plan-tools > summary').click()
}
async function pickDate(page, label, value) {
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).click()
  await page
    .getByLabel('Chọn năm', { exact: true })
    .selectOption(value.slice(0, 4))
  await page
    .getByLabel('Chọn tháng', { exact: true })
    .selectOption(String(Number(value.slice(5, 7)) - 1))
  await button(
    page,
    new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(
      new Date(`${value}T12:00:00`),
    ),
  ).click()
}
try {
  await check(
    'redesign visual responsive light dark and reduced motion',
    async () => {
      for (const theme of ['light', 'dark']) {
        const f = await fixture({ known: true, theme })
        for (const width of [360, 390, 768, 1024, 1440]) {
          await f.page.setViewportSize({ width, height: 1000 })
          await f.goto(`/app/nutrition?date=${date}`)
          await visible(
            f.page.getByRole('heading', { name: 'Những bữa ăn của bạn' }),
          )
          assert.equal(
            await f.page.locator('html').getAttribute('data-theme'),
            theme,
          )
          await noOverflow(f.page)
          await f.page.screenshot({
            path: `${output}/today-${width}-${theme}.png`,
            fullPage: true,
          })
          await tab(f.page, 'Thực đơn').click()
          await visible(button(f.page, 'Đổi món / khẩu phần'))
          await noOverflow(f.page)
          await f.page.screenshot({
            path: `${output}/plan-${width}-${theme}.png`,
            fullPage: true,
          })
          await tab(f.page, 'Nhật ký').click()
          await visible(
            f.page.getByRole('heading', { name: 'Nhật ký ăn uống' }),
          )
          await noOverflow(f.page)
          await f.page.screenshot({
            path: `${output}/diary-${width}-${theme}.png`,
            fullPage: true,
          })
        }
        await f.context.close()
      }
    },
  )
  await check(
    'redesign 1 3 7 days preview save and cached date navigation',
    async () => {
      for (const count of [1, 3, 7]) {
        const f = await fixture()
        await f.goto(`/app/nutrition?tab=plan&date=${date}`)
        await priorities(f.page, count)
        await f.page
          .getByLabel('Ngân sách mỗi ngày', { exact: true })
          .fill('5000000')
        assert.equal(
          await f.page
            .getByLabel('Ngân sách mỗi ngày', { exact: true })
            .inputValue(),
          '5.000.000',
        )
        await preview(f.page)
        assert.equal(f.state.previewBodies[0].day_count, count)
        assert.equal(
          f.state.previewBodies[0].constraints.daily_budget_vnd,
          5000000,
        )
        assert.equal(f.state.counts['POST /meal-plans'] || 0, 0)
        if (count > 1) {
          const requests = structuredClone(f.state.counts)
          await f.page
            .getByRole('navigation', { name: 'Ngày trong thực đơn' })
            .getByRole('button')
            .last()
            .click()
          await visible(button(f.page, 'Lưu và tùy chỉnh'))
          assert.deepEqual(f.state.counts, requests)
        }
        await button(f.page, 'Lưu và tùy chỉnh').click()
        await visible(button(f.page, 'Đổi món / khẩu phần'))
        assert.equal(f.state.counts['POST /meal-plans'], 1)
        assert.equal(
          f.state.counts['GET /meal-plans/plan-qa'] || 0,
          0,
          'Save response seeds plan, without a redundant GET',
        )
        await f.context.close()
      }
    },
  )
  await check(
    'redesign locked meals retain the original date in a new preview',
    async () => {
      const f = await fixture({ known: true })
      f.state.plan.days[0].slots[0].items[0].locked = true
      await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await tools(f.page)
      await button(f.page, 'Tạo bản xem trước khác').click()
      await priorities(f.page, 3)
      await f.page.locator('.nutrition-advanced > summary').click()
      await f.page.getByRole('checkbox', { name: /Lặp 1 món đang giữ/ }).check()
      await preview(f.page)
      assert.deepEqual(f.state.previewBodies[0].locked_items, [
        { meal_type: 'LUNCH', sequence: 1, recipe_id: 'rec.rice', servings: 1 },
      ])
      assert.equal(
        f.state.counts['PATCH /meal-plans/plan-qa/items/item-rice'] || 0,
        0,
      )
      await f.context.close()
    },
  )
  await check(
    'redesign edit serving lock undo and optimistic versions',
    async () => {
      const f = await fixture({ known: true })
      await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await openEditor(f.page)
      await f.page.getByLabel('Số phần').fill('1.5')
      await button(f.page, 'Cập nhật khẩu phần').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      const patch = f.state.writes.find((w) => w.method === 'PATCH')
      assert.equal(patch.body.servings, 1.5)
      assert.equal(patch.body.expected_plan_version, 1)
      await f.page
        .getByRole('button', { name: 'Giữ món Cơm trắng', exact: true })
        .click()
      await visible(f.page.getByRole('button', { name: 'Bỏ giữ Cơm trắng' }))
      await tools(f.page)
      await button(f.page, 'Hoàn tác thao tác gần nhất').click()
      await f.page.waitForFunction(
        () =>
          !document.querySelector(
            '.nutrition-plan-tools button[aria-busy=true]',
          ),
      )
      assert.equal(f.state.counts['GET /meal-plans/plan-qa'], 1)
      await f.context.close()
    },
  )
  await check(
    'redesign diary confirmation half of planned amount idempotent retry edit and delete',
    async () => {
      const f = await fixture({
        known: true,
        plannedServings: 2,
        diaryRetryOnce: true,
      })
      await f.goto(`/app/nutrition?date=${date}&plan=plan-qa`)
      await button(f.page, 'Ghi đã ăn').click()
      await visible(f.page.getByRole('dialog'))
      assert.equal(f.state.counts['POST /diary-entries'] || 0, 0)
      await f.page.getByRole('button', { name: /^Ăn một nửa/ }).click()
      assert.equal(await f.page.getByLabel('Số phần đã ăn').inputValue(), '1')
      await button(f.page, 'Xác nhận ghi nhật ký').click()
      await visible(button(f.page, 'Thử lại lần ghi này'))
      await button(f.page, 'Thử lại lần ghi này').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      assert.equal(f.state.diaryEntries.length, 1)
      const writes = f.state.writes.filter((w) => w.path === '/diary-entries')
      assert.deepEqual(writes[0].body, writes[1].body)
      assert.equal(writes[0].body.servings, 1)
      assert.equal(writes[0].body.source_plan_item_id, 'item-rice')
      await f.page.locator('.nutrition-entry-menu > summary').click()
      await button(f.page, 'Sửa món đã ghi').click()
      await f.page.getByLabel('Số phần đã ăn').fill('1.25')
      await button(f.page, 'Lưu thay đổi nhật ký').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      assert.equal(f.state.diaryEntries[0].servings, 1.25)
      if (
        !(await f.page
          .locator('.nutrition-entry-menu')
          .getAttribute('open')
          .then((value) => value !== null))
      )
        await f.page.locator('.nutrition-entry-menu > summary').click()
      await button(f.page, 'Xóa món đã ghi').click()
      await button(f.page, 'Xác nhận xóa nhật ký').click()
      await visible(
        f.page.getByRole('heading', { name: 'Chưa có món nào được ghi' }),
      )
      assert.equal(f.state.diaryEntries.length, 0)
      await f.context.close()
    },
  )
  await check(
    'redesign custom diary and feedback remain explicit',
    async () => {
      const f = await fixture()
      await f.goto(`/app/nutrition?tab=diary&date=${date}`)
      await button(f.page, 'Ghi món').click()
      await button(f.page, 'Ghi món tự nhập').click()
      await f.page.getByLabel('Tên món tự nhập').fill('Bún rau tự nấu')
      await f.page.getByLabel('Lượng đã ăn (mô tả)').fill('Một tô')
      await button(f.page, 'Xác nhận ghi nhật ký').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      await visible(f.page.getByRole('heading', { name: 'Bún rau tự nấu' }))
      assert.equal(f.state.diaryEntries[0].custom_text, 'Bún rau tự nấu')
      await f.context.close()
    },
  )
  await check(
    'redesign old diary responses never overwrite a newly selected date',
    async () => {
      const f = await fixture({ diaryDelayDate: date })
      f.state.diaryEntries = [
        {
          entry_id: 'old',
          local_date: date,
          meal_type: 'LUNCH',
          name: 'Món riêng ngày cũ',
          custom_text: 'Món riêng ngày cũ',
          nutrition: {},
          coverage: 'PARTIAL',
          notes: [],
        },
      ]
      const started = f.page.waitForRequest((r) =>
        r.url().endsWith(`/diary?date=${date}`),
      )
      await f.goto(`/app/nutrition?tab=diary&date=${date}`)
      await started
      await pickDate(f.page, 'Ngày nhật ký', '2026-10-19')
      await visible(
        f.page.getByRole('heading', { name: 'Chưa có món nào được ghi' }),
      )
      await f.page.waitForTimeout(800)
      assert.equal(
        await f.page
          .getByRole('heading', { name: 'Món riêng ngày cũ' })
          .count(),
        0,
      )
      await f.context.close()
    },
  )
  await check(
    'redesign cached tab visits do not repeat profile plan diary or catalog requests',
    async () => {
      const f = await fixture({ known: true })
      await f.goto(`/app/nutrition?date=${date}`)
      await visible(button(f.page, 'Ghi đã ăn'))
      await tab(f.page, 'Khám phá').click()
      await visible(f.page.getByRole('heading', { name: 'Khám phá món ăn' }))
      await visible(
        f.page.getByRole('heading', { name: 'Cơm trắng', exact: true }).first(),
      )
      const counts = structuredClone(f.state.counts)
      for (const name of ['Thực đơn', 'Nhật ký', 'Hôm nay', 'Khám phá']) {
        await tab(f.page, name).click()
        await f.page.waitForTimeout(150)
      }
      assert.deepEqual(f.state.counts, counts)
      await f.context.close()
    },
  )
  await check(
    'redesign shopping checklist mutations use returned totals and custom CRUD',
    async () => {
      const f = await fixture({ known: true })
      await f.goto(`/app/nutrition/shopping/plan-qa?date=${date}&tab=plan`)
      await visible(f.page.getByRole('heading', { name: 'Gạo tẻ' }))
      await f.page
        .locator('.nutrition-shopping-quick-actions')
        .first()
        .getByRole('button')
        .click()
      await visible(
        f.page.getByText('Đã cập nhật danh sách mua sắm.', { exact: true }),
      )
      assert.equal(f.state.counts['GET /meal-plans/plan-qa/shopping-list'], 1)
      await button(f.page, '+ Thêm dòng tự nhập').click()
      await f.page.getByLabel('Nội dung', { exact: true }).fill('Túi giữ nhiệt')
      await button(f.page, 'Thêm vào danh sách').click()
      await visible(f.page.getByRole('heading', { name: 'Túi giữ nhiệt' }))
      const row = f.page
        .locator('.nutrition-shopping-item')
        .filter({ has: f.page.getByRole('heading', { name: 'Túi giữ nhiệt' }) })
      await row.locator('details > summary').click()
      await row.getByRole('button', { name: 'Xóa dòng' }).click()
      await button(f.page, 'Xác nhận xóa').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      assert.equal(f.state.custom.length, 0)
      await f.context.close()
    },
  )
  await check(
    'redesign initial loading uses existing loader and section skeletons',
    async () => {
      const f = await fixture()
      await f.context.route('**/api/v1/me/nutrition-profile', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 800))
        await route.fallback()
      })
      await f.goto(`/app/nutrition?date=${date}`)
      await visible(
        f.page
          .getByRole('status')
          .filter({ hasText: 'Đang chuẩn bị dinh dưỡng của bạn' }),
      )
      assert.ok((await f.page.locator('.nutrition-skeleton-row').count()) > 0)
      await f.page.screenshot({
        path: `${output}/page-loading.png`,
        fullPage: true,
      })
      await visible(
        f.page.getByRole('heading', { name: 'Hôm nay bạn muốn ăn gì?' }),
      )
      await f.context.close()
    },
  )
  await check(
    'redesign 429 respects Retry-After without auto writes',
    async () => {
      const f = await fixture()
      await f.context.route('**/api/v1/meal-plans/preview', (route) =>
        route.fulfill({
          status: 429,
          headers: { 'Retry-After': '30' },
          json: {
            error: { code: 'RATE_LIMITED', message: 'Thử lại sau', fields: {} },
          },
        }),
      )
      await f.goto(`/app/nutrition?tab=plan&date=${date}`)
      await priorities(f.page)
      const requested = f.page.waitForRequest((r) =>
        r.url().endsWith('/meal-plans/preview'),
      )
      await button(f.page, 'Tạo bản xem trước').click()
      await requested
      await visible(
        f.page.getByText('Bạn đang thao tác hơi nhanh', { exact: true }),
      )
      assert.equal(await button(f.page, 'Tạo bản xem trước').isDisabled(), true)
      assert.equal(
        await f.page
          .getByLabel('Ngân sách mỗi ngày', { exact: true })
          .inputValue(),
        '120.000',
      )
      await f.context.close()
    },
  )
  await check(
    'redesign profile edits open directly and save one group',
    async () => {
      const f = await fixture()
      await f.goto(`/app/nutrition?date=${date}`)
      await f.page.locator('.nutrition-profile-menu > summary').click()
      await button(f.page, 'Sinh hoạt').click()
      await visible(f.page.getByRole('dialog', { name: 'Hồ sơ ăn uống' }))
      await f.page
        .getByLabel('Ngân sách mỗi ngày', { exact: true })
        .fill('150000')
      await button(f.page, 'Lưu thay đổi').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      assert.equal(f.state.profile.daily_budget_vnd, 150000)
      assert.equal(f.state.counts['PUT /me/nutrition-profile'], 1)
      await f.context.close()
    },
  )
  await check(
    'redesign regeneration preserves eaten meals without diary preflight',
    async () => {
      const f = await fixture({ known: true, dayCount: 7 })
      f.state.diaryEntries = [
        {
          entry_id: 'eaten',
          source_plan_item_id: 'item-rice',
          local_date: date,
          meal_type: 'LUNCH',
          name: 'Cơm trắng',
          recipe_id: 'rec.rice',
          servings: 1,
          notes: [],
        },
      ]
      await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await tools(f.page)
      await button(f.page, 'Tạo lại món chưa giữ').click()
      await visible(f.page.getByText(/Các bữa đã ghi nhật ký được giữ nguyên/))
      assert.equal(f.state.diaryDates.length, 0)
      assert.equal(await button(f.page, 'Xác nhận tạo lại').isDisabled(), false)
      assert.equal(
        f.state.counts['POST /meal-plans/plan-qa/regenerate'] || 0,
        0,
      )
      const history = structuredClone(f.state.diaryEntries)
      const eaten = structuredClone(f.state.plan.days[0].slots[0].items)
      await button(f.page, 'Xác nhận tạo lại').click()
      await visible(f.page.getByText('Các bữa đã ghi nhật ký được giữ nguyên khi tạo lại thực đơn.'))
      assert.equal(f.state.counts['POST /meal-plans/plan-qa/regenerate'], 1)
      assert.equal(f.state.diaryDates.length, 0)
      assert.deepEqual(f.state.diaryEntries, history)
      assert.deepEqual(f.state.plan.days[0].slots[0].items, eaten)
      assert.equal(f.state.plan.days[1].slots[0].items[0].recipe_id, 'rec.rice2')
      await f.context.close()
    },
  )
  await check(
    'redesign no-match budget recovery requires explicit consent and never changes allergies',
    async () => {
      const f = await fixture({ noMatch: true, budgetNoMatch: true })
      await f.goto(`/app/nutrition?tab=plan&date=${date}`)
      await priorities(f.page)
      await f.page.locator('.nutrition-advanced > summary').click()
      await f.page
        .getByRole('checkbox', { name: 'Bắt buộc trong ngân sách đã nhập' })
        .check()
      await button(f.page, 'Tạo bản xem trước').click()
      await visible(button(f.page, 'Dùng ngân sách dự kiến'))
      assert.equal(await button(f.page, 'Lưu và tùy chỉnh').count(), 0)
      assert.equal(
        (await f.page.locator('.nutrition-page').innerText()).includes(
          'STRICT_BUDGET_WITHOUT_PRICE',
        ),
        false,
      )
      await f.page.screenshot({
        path: `${output}/no-match.png`,
        fullPage: true,
      })
      await button(f.page, 'Dùng ngân sách dự kiến').click()
      await visible(button(f.page, 'Tạo bản xem trước'))
      assert.equal(
        f.state.previewBodies.length,
        1,
        'Changing preferences does not automatically generate again',
      )
      await f.page.locator('.nutrition-advanced > summary').click()
      assert.equal(
        await f.page
          .getByRole('checkbox', { name: 'Bắt buộc trong ngân sách đã nhập' })
          .isChecked(),
        false,
      )
      f.state.noMatch = false
      f.state.budgetNoMatch = false
      await preview(f.page)
      assert.equal(f.state.previewBodies[1].constraints.strict_budget, false)
      assert.equal(
        f.state.previewBodies[1].constraints.daily_budget_vnd,
        120000,
      )
      assert.equal(f.state.counts['PUT /me/nutrition-profile'] || 0, 0)
      await f.context.close()
    },
  )
  await check(
    'redesign preview retries preserve payload and expired previews cannot save',
    async () => {
      const f = await fixture({ retryOnce: true, shortExpiry: true })
      await f.goto(`/app/nutrition?tab=plan&date=${date}`)
      await priorities(f.page, 3)
      await button(f.page, 'Tạo bản xem trước').click()
      await visible(button(f.page, 'Thử lại yêu cầu vừa gửi'))
      await button(f.page, 'Thử lại yêu cầu vừa gửi').click()
      await visible(button(f.page, 'Lưu và tùy chỉnh'))
      assert.deepEqual(f.state.previewBodies[0], f.state.previewBodies[1])
      await visible(
        f.page.getByText('Bản xem trước đã hết hạn', { exact: true }),
      )
      assert.equal(await button(f.page, 'Lưu và tùy chỉnh').isDisabled(), true)
      assert.equal(f.state.counts['POST /meal-plans'] || 0, 0)
      await f.context.close()
    },
  )
  await check(
    'redesign save conflicts return to preserved choices without replaying writes',
    async () => {
      const f = await fixture({ saveConflict: true })
      await f.goto(`/app/nutrition?tab=plan&date=${date}`)
      await priorities(f.page, 7)
      await preview(f.page)
      await button(f.page, 'Lưu và tùy chỉnh').click()
      await visible(button(f.page, 'Tạo bản xem trước'))
      assert.equal(f.state.counts['POST /meal-plans'], 1)
      assert.equal(
        await f.page
          .getByLabel('Ngân sách mỗi ngày', { exact: true })
          .inputValue(),
        '120.000',
      )
      await button(f.page, 'Quay lại').click()
      assert.equal(
        await button(f.page, '7 ngày · Cả tuần').getAttribute('aria-pressed'),
        'true',
      )
      await f.context.close()
    },
  )
  await check(
    'redesign onboarding skip optional fields and keyboard focus stays in dialog',
    async () => {
      const f = await fixture({
        profile: { profile_version: 0, allergy_status: 'UNKNOWN' },
      })
      await f.goto(`/app/nutrition?date=${date}`)
      await button(f.page, 'Thiết lập hồ sơ ăn uống').click()
      await visible(f.page.getByRole('dialog'))
      for (let i = 0; i < 12; i++) {
        await f.page.keyboard.press('Tab')
        assert.equal(
          await f.page.evaluate(() =>
            Boolean(document.activeElement?.closest('[role=dialog]')),
          ),
          true,
        )
      }
      await button(f.page, 'Tiếp tục').click()
      await f.page
        .getByRole('radio', { name: 'Không có dị ứng đã biết' })
        .check()
      await button(f.page, 'Lưu và tiếp tục').click()
      await button(f.page, 'Bỏ qua').click()
      await button(f.page, 'Lưu và tiếp tục').click()
      await button(f.page, 'Để sau').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      assert.equal(f.state.counts['PUT /me/nutrition-profile'], 2)
      assert.equal(f.state.profile.allergy_status, 'KNOWN_NONE')
      await f.context.close()
    },
  )
  await check(
    'redesign catalog cooking modes filters image fallback and reflow equivalent to 200 percent zoom',
    async () => {
      const f = await fixture()
      await f.goto(`/app/nutrition?tab=explore&date=${date}`)
      await visible(f.page.getByRole('heading', { name: 'Khám phá món ăn' }))
      await chooseSelect(f.page, 'Loại món', 'Tinh bột')
      await visible(
        f.page.getByRole('heading', { name: 'Cơm trắng', exact: true }),
      )
      await f.page.getByRole('link', { name: 'Cơm trắng', exact: true }).click()
      await visible(button(f.page, 'Bắt đầu chế độ nấu'))
      await button(f.page, 'Bắt đầu chế độ nấu').click()
      assert.equal(f.state.counts['POST /diary-entries'] || 0, 0)
      await button(f.page, 'Bước tiếp theo').click()
      await button(f.page, 'Bước tiếp theo').click()
      await button(f.page, 'Kết thúc hướng dẫn').click()
      assert.equal(f.state.counts['POST /diary-entries'] || 0, 0)
      await f.page.screenshot({
        path: `${output}/recipe-details.png`,
        fullPage: true,
      })
      await f.goto(`/app/nutrition?tab=plan&date=${date}`)
      await priorities(f.page)
      await f.page.screenshot({
        path: `${output}/builder-priorities.png`,
        fullPage: true,
      })
      // Browser zoom reduces CSS viewport dimensions; CSS `zoom` does not and breaks viewport-unit comparisons.
      await f.page.setViewportSize({ width: 720, height: 500 })
      await noOverflow(f.page)
      await f.page.locator('.nutrition-profile-menu > summary').click()
      await button(f.page, 'Sinh hoạt').click()
      await visible(f.page.getByRole('dialog'))
      await noOverflow(f.page)
      await f.page.screenshot({
        path: `${output}/profile-zoom-200.png`,
        fullPage: true,
      })
      await f.page.keyboard.press('Escape')
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      await f.context.close()
    },
  )
  await check(
    'redesign account changes cannot reveal previous plan or diary',
    async () => {
      const f = await fixture({ known: true })
      await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await visible(button(f.page, 'Đổi món / khẩu phần'))
      f.state.accountB = true
      await f.page.evaluate(() => {
        const session = JSON.parse(
          sessionStorage.getItem('nutrimom.auth-session'),
        )
        session.user.id = 'nutrition-account-b'
        sessionStorage.setItem('nutrimom.auth-session', JSON.stringify(session))
      })
      await f.page.reload()
      await visible(f.page.getByRole('alert'))
      assert.equal(await button(f.page, 'Đổi món / khẩu phần').count(), 0)
      await f.context.close()
    },
  )
  await check(
    'redesign mobile calendar profile dialog and Family button motion stay contained',
    async () => {
      const f = await fixture({ reducedMotion: 'no-preference' })
      await f.page.setViewportSize({ width: 360, height: 800 })
      await f.goto(`/app/nutrition?tab=plan&date=${date}`)
      await f.page.getByRole('button', { name: /^Ngày bắt đầu/ }).click()
      await visible(f.page.getByLabel('Chọn tháng', { exact: true }))
      await noOverflow(f.page)
      await f.page.keyboard.press('Escape')
      await f.page.locator('.nutrition-profile-menu > summary').click()
      await button(f.page, 'Sinh hoạt').click()
      await visible(f.page.getByRole('dialog'))
      const bounds = await f.page.getByRole('dialog').boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 361)
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 801)
      await f.page.screenshot({
        path: `${output}/profile-360.png`,
        fullPage: true,
        animations: 'disabled',
      })
      await f.page.keyboard.press('Escape')
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      await tab(f.page, 'Khám phá').click()
      await visible(f.page.getByRole('heading', { name: 'Khám phá món ăn' }))
      assert.equal(
        await f.page.locator('.nutrition-tabs .nm-tab-indicator').count(),
        1,
      )
      assert.equal(await f.page.locator('.nm-stacked-tab-panel').count(), 0)
      await f.context.close()
    },
  )
  assert.deepEqual(unexpected, [])
  assert.deepEqual(pageErrors, [])
  assert.deepEqual(consoleErrors, [])
} finally {
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(
      {
        passed,
        unexpected,
        pageErrors,
        consoleErrors,
        browser: browser.version(),
        integration:
          'Contract fixtures only; no claim of deployed API end-to-end validation.',
      },
      null,
      2,
    ),
  )
  await browser.close()
  await server.close()
}
