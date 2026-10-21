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
  noOverflow,
  date,
  writeFile,
} from './helpers/nutrition-browser.mjs'

const measurements = []
const scopeName = 'Chọn nguyên liệu cần mua'
const scopeDialog = (page) =>
  page.getByRole('dialog', { name: scopeName, exact: true })
const tabs = (page, name) =>
  page.locator('.nutrition-tabs').getByRole('link', { name, exact: true })
const counts = (f) =>
  Object.fromEntries(
    Object.entries(f.state.counts).filter(([key]) =>
      /nutrition-profile|meal-plans|diary|recipes|meal-feedback/.test(key),
    ),
  )
const shoppingReads = (f) =>
  f.state.counts['GET /meal-plans/plan-qa/shopping-list'] || 0
async function openScope(f) {
  await button(f.page, 'Chọn phạm vi và món cần mua nguyên liệu').click()
  await visible(scopeDialog(f.page))
}
async function shopping(f) {
  await f.goto(`/app/nutrition/shopping/plan-qa?tab=plan&date=${date}`)
  await visible(f.page.getByRole('heading', { name: 'Gạo tẻ', exact: true }))
}
async function recipe(f) {
  await f.goto(`/app/nutrition/recipes/rec.rice?tab=explore&date=${date}`)
  await visible(button(f.page, 'Bắt đầu chế độ nấu'))
  await f.page.waitForLoadState('networkidle')
}
async function assertGreen(locator) {
  const colors = await locator.evaluate((node) => ({
    actual: getComputedStyle(node).color,
    success: (() => {
      const span = document.createElement('span')
      span.style.color = 'var(--success)'
      node.appendChild(span)
      const color = getComputedStyle(span).color
      span.remove()
      return color
    })(),
  }))
  assert.equal(colors.actual, colors.success)
}
async function closed(page, name) {
  await page
    .getByRole('dialog', { name, exact: true })
    .waitFor({ state: 'hidden' })
  await page.waitForFunction(() => document.body.style.overflow !== 'hidden')
}
try {
  await check(
    'refinements feedback confirms only a successful save, turns green and prevents repeated identical submissions',
    async () => {
      const f = await fixture({ known: true })
      f.state.diaryEntries.push({
        entry_id: 'feedback-entry',
        local_date: date,
        meal_type: 'LUNCH',
        recipe_id: 'rec.rice',
        name: 'Cơm trắng',
        servings: 1,
        coverage: 'COMPLETE',
        estimate_incomplete: false,
        source_plan_item_id: 'item-rice',
        nutrition: {},
        notes: [],
      })
      await f.goto(`/app/nutrition?tab=diary&date=${date}`)
      await button(f.page, 'Hợp khẩu vị').click()
      await visible(
        f.page.getByText('Đã ghi nhận: Hợp khẩu vị.', { exact: true }),
      )
      await assertGreen(f.page.locator('.nutrition-feedback-confirmation'))
      assert.equal(
        await button(f.page, 'Hợp khẩu vị').getAttribute('aria-pressed'),
        'true',
      )
      assert.equal(f.state.counts['POST /meal-feedback'], 1)
      await button(f.page, 'Hợp khẩu vị').click()
      assert.equal(f.state.counts['POST /meal-feedback'], 1)
      await f.context.route('**/api/v1/meal-feedback', (route) =>
        route.fulfill({
          status: 503,
          json: {
            error: { code: 'TEMPORARY', message: 'Chưa lưu được phản hồi' },
          },
        }),
      )
      await button(f.page, 'Không thích').click()
      await visible(f.page.getByRole('alert'))
      assert.equal(
        await f.page.locator('.nutrition-feedback-confirmation').count(),
        0,
      )
      assert.equal(
        await button(f.page, 'Hợp khẩu vị').getAttribute('aria-pressed'),
        'true',
      )
      await f.context.unroute('**/api/v1/meal-feedback')
      await button(f.page, 'Không thích').click()
      await visible(
        f.page.getByText('Đã ghi nhận: Không thích.', { exact: true }),
      )
      assert.deepEqual(
        f.state.writes
          .filter((w) => w.path === '/meal-feedback')
          .map((w) => w.body),
        [
          { recipe_id: 'rec.rice', type: 'TASTY' },
          { recipe_id: 'rec.rice', type: 'DISLIKE' },
        ],
      )
      await f.page.screenshot({
        path: `${output}/feedback-green.png`,
        fullPage: true,
      })
      await tabs(f.page, 'Hôm nay').click()
      await visible(f.page.getByText('Có ghi nhật ký', { exact: true }))
      await assertGreen(f.page.locator('.nutrition-logged-badge'))
      await f.page.screenshot({
        path: `${output}/today-logged-green.png`,
        fullPage: true,
      })
      await f.context.close()
    },
  )
  await check(
    'refinements cooking uses dash list, centered actions and a glass dialog with local-only step navigation',
    async () => {
      const f = await fixture({ known: true, reducedMotion: 'no-preference' })
      await recipe(f)
      assert.equal(
        await f.page.locator('ul.nutrition-cooking-steps > li').count(),
        3,
      )
      assert.equal(
        await f.page
          .locator('.nutrition-cooking-steps > li')
          .first()
          .evaluate((n) => getComputedStyle(n, '::before').content),
        '"-"',
      )
      for (const selector of [
        '.nutrition-detail-body',
        '.nutrition-detail-side',
      ]) {
        const card = await f.page.locator(selector).boundingBox(),
          action = await f.page
            .locator(`${selector} .nutrition-centered-action > *`)
            .boundingBox()
        assert.ok(
          Math.abs(card.x + card.width / 2 - action.x - action.width / 2) < 2,
        )
      }
      const before = counts(f),
        writes = f.state.writes.length
      await button(f.page, 'Bắt đầu chế độ nấu').click()
      const dialog = f.page.getByRole('dialog', {
        name: 'Chế độ nấu',
        exact: true,
      })
      await visible(dialog)
      const blur = await dialog.evaluate(
        (n) => getComputedStyle(n).backdropFilter,
      )
      assert.ok(blur.includes('blur(22px)'))
      assert.equal(await button(f.page, 'Bước trước').isDisabled(), true)
      await button(f.page, 'Bước tiếp theo').click()
      await visible(dialog.getByText('Bước 2 / 3', { exact: true }))
      await button(f.page, 'Bước trước').click()
      await visible(dialog.getByText('Bước 1 / 3', { exact: true }))
      await button(f.page, 'Bước tiếp theo').click()
      await button(f.page, 'Bước tiếp theo').click()
      await button(f.page, 'Kết thúc hướng dẫn').click()
      await closed(f.page, 'Chế độ nấu')
      assert.equal(
        await button(f.page, 'Bắt đầu chế độ nấu').evaluate(
          (n) => n === document.activeElement,
        ),
        true,
      )
      await button(f.page, 'Bắt đầu chế độ nấu').click()
      await visible(dialog.getByText('Bước 1 / 3', { exact: true }))
      await f.page.keyboard.press('Tab')
      assert.equal(
        await f.page.evaluate(
          () => !!document.activeElement.closest('[role="dialog"]'),
        ),
        true,
      )
      await f.page.keyboard.press('Escape')
      await closed(f.page, 'Chế độ nấu')
      assert.deepEqual(counts(f), before)
      assert.equal(f.state.writes.length, writes)
      await f.context.close()
    },
  )
  await check(
    'refinements shopping drafts seven days locally, preserves checks while paging and applies exactly one scope request',
    async () => {
      const f = await fixture({ known: true, dayCount: 7 })
      await shopping(f)
      const before = shoppingReads(f),
        url = f.page.url(),
        writes = f.state.writes.length
      await openScope(f)
      assert.equal(await button(f.page, 'Ngày trước').isDisabled(), true)
      await f.page.getByLabel('Cơm trắng', { exact: true }).uncheck()
      await button(f.page, 'Ngày sau').click()
      await visible(
        scopeDialog(f.page).getByRole('heading', {
          name: '19/10/2026',
          exact: true,
        }),
      )
      assert.equal(
        await f.page.getByLabel('Cơm trắng', { exact: true }).isChecked(),
        true,
      )
      await button(f.page, 'Ngày trước').click()
      assert.equal(
        await f.page.getByLabel('Cơm trắng', { exact: true }).isChecked(),
        false,
      )
      for (let i = 0; i < 6; i++) await button(f.page, 'Ngày sau').click()
      assert.equal(await button(f.page, 'Ngày sau').isDisabled(), true)
      assert.ok(
        (
          await f.page.locator('.nutrition-scope-pagination').innerText()
        ).includes('24/10/2026'),
      )
      assert.equal(shoppingReads(f), before)
      assert.equal(f.page.url(), url)
      await button(f.page, 'Hủy').click()
      await closed(f.page, scopeName)
      await openScope(f)
      assert.equal(
        await f.page.getByLabel('Cơm trắng', { exact: true }).isChecked(),
        true,
      )
      await f.page.getByLabel('Mua từ ngày', { exact: true }).fill('2026-10-19')
      await f.page
        .getByLabel('Mua đến ngày', { exact: true })
        .fill('2026-10-21')
      await f.page.getByLabel('Cơm trắng', { exact: true }).uncheck()
      assert.equal(shoppingReads(f), before)
      await button(f.page, 'Áp dụng lựa chọn').click()
      await closed(f.page, scopeName)
      await f.page.waitForFunction(
        () =>
          !document.querySelector(
            '.nutrition-loading,.nutrition-loading-pending',
          ),
      )
      assert.equal(shoppingReads(f), before + 1)
      assert.ok(f.state.shoppingQuery.includes('start_date=2026-10-19'))
      assert.ok(f.state.shoppingQuery.includes('end_date=2026-10-21'))
      assert.ok(f.state.shoppingQuery.includes('exclude_item_ids=item-rice-1'))
      assert.equal(f.state.writes.length, writes)
      await openScope(f)
      assert.equal(
        await f.page.getByLabel('Mua từ ngày', { exact: true }).inputValue(),
        '2026-10-19',
      )
      assert.equal(
        await f.page.getByLabel('Cơm trắng', { exact: true }).isChecked(),
        false,
      )
      await f.page.keyboard.press('Escape')
      await closed(f.page, scopeName)
      await f.page.reload()
      await visible(button(f.page, 'Chọn phạm vi và món cần mua nguyên liệu'))
      await openScope(f)
      assert.equal(
        await f.page.getByLabel('Cơm trắng', { exact: true }).isChecked(),
        false,
      )
      await f.context.close()
    },
  )
  await check(
    'refinements shopping validates dates, handles a single day and can exclude every recipe',
    async () => {
      const f = await fixture({ known: true })
      await shopping(f)
      await openScope(f)
      assert.equal(await button(f.page, 'Ngày trước').isDisabled(), true)
      assert.equal(await button(f.page, 'Ngày sau').isDisabled(), true)
      await f.page
        .getByLabel('Mua đến ngày', { exact: true })
        .fill('2026-10-17')
      await visible(scopeDialog(f.page).getByRole('alert'))
      assert.equal(await button(f.page, 'Áp dụng lựa chọn').isDisabled(), true)
      await f.page.getByLabel('Mua đến ngày', { exact: true }).fill(date)
      await f.page.getByLabel('Cơm trắng', { exact: true }).uncheck()
      await button(f.page, 'Áp dụng lựa chọn').click()
      await closed(f.page, scopeName)
      await visible(
        f.page.getByRole('heading', {
          name: 'Không có dòng nào trong lựa chọn này',
        }),
      )
      await openScope(f)
      await f.page.mouse.click(3, 3)
      await closed(f.page, scopeName)
      assert.equal(
        await button(
          f.page,
          'Chọn phạm vi và món cần mua nguyên liệu',
        ).evaluate((n) => n === document.activeElement),
        true,
      )
      await f.context.close()
    },
  )
  await check(
    'refinements new dialogs reflow on mobile desktop light dark, low height and text enlarged to 200 percent',
    async () => {
      for (const theme of ['light', 'dark'])
        for (const width of [360, 768, 1440]) {
          const f = await fixture({ known: true, dayCount: 3, theme })
          await f.page.setViewportSize({ width, height: 900 })
          await recipe(f)
          await f.page.screenshot({
            path: `${output}/recipe-${width}-${theme}.png`,
            fullPage: true,
          })
          await button(f.page, 'Bắt đầu chế độ nấu').click()
          await visible(
            f.page.getByRole('dialog', { name: 'Chế độ nấu', exact: true }),
          )
          await noOverflow(f.page)
          await f.page.screenshot({
            path: `${output}/cooking-${width}-${theme}.png`,
          })
          await button(f.page, 'Đóng chế độ nấu').click()
          await closed(f.page, 'Chế độ nấu')
          await shopping(f)
          await openScope(f)
          if (theme === 'dark')
            assert.equal(
              await f.page
                .locator('.nutrition-scope-range input')
                .first()
                .evaluate((node) => getComputedStyle(node).colorScheme),
              'dark',
            )
          await noOverflow(f.page)
          const footer = await f.page
            .locator('.nutrition-scope-dialog .nm-dialog-footer')
            .boundingBox()
          await f.page
            .locator('.nutrition-scope-dialog .nm-dialog-body')
            .evaluate((n) => (n.scrollTop = n.scrollHeight))
          assert.equal(
            Math.round(
              (
                await f.page
                  .locator('.nutrition-scope-dialog .nm-dialog-footer')
                  .boundingBox()
              ).y,
            ),
            Math.round(footer.y),
          )
          await f.page.screenshot({
            path: `${output}/shopping-scope-${width}-${theme}.png`,
          })
          await f.context.close()
        }
      for (const [width, height, scale] of [
        [360, 500, 1],
        [720, 500, 1],
        [360, 900, 2],
      ]) {
        const f = await fixture({ known: true, dayCount: 7 })
        await f.page.setViewportSize({ width, height })
        await shopping(f)
        if (scale === 2)
          await f.page.addStyleTag({
            content: 'html {font-size:200% !important}',
          })
        await openScope(f)
        await noOverflow(f.page)
        const body = await f.page
          .locator('.nutrition-scope-dialog .nm-dialog-body')
          .evaluate((n) => ({
            height: n.clientHeight,
            width: n.clientWidth,
            scroll: n.scrollWidth,
          }))
        assert.ok(body.height > 60)
        assert.ok(body.scroll <= body.width + 1)
        const apply = await button(f.page, 'Áp dụng lựa chọn').boundingBox()
        assert.ok(apply.y + apply.height <= height)
        await f.page.screenshot({
          path: `${output}/shopping-reflow-${width}-${height}-${scale}.png`,
        })
        await button(f.page, 'Hủy').click()
        await closed(f.page, scopeName)
        if (scale === 2) {
          await recipe(f)
          await f.page.addStyleTag({
            content: 'html {font-size:200% !important}',
          })
          await button(f.page, 'Bắt đầu chế độ nấu').click()
          await noOverflow(f.page)
          await f.page.screenshot({ path: `${output}/cooking-text-200.png` })
        }
        await f.context.close()
      }
    },
  )
  await check(
    'refinements today starts independent reads in parallel on a known day and retains the three-read limit',
    async () => {
      const f = await fixture({ known: true })
      await f.page.clock.setFixedTime(new Date(`${date}T05:00:00Z`))
      for (const [path, delay] of [
        ['me/nutrition-profile', 1200],
        ['diary?*', 800],
        ['meal-plans/plan-qa', 700],
      ])
        await f.context.route(`**/api/v1/${path}`, async (route) => {
          await new Promise((r) => setTimeout(r, delay))
          await route.fallback()
        })
      const started = Date.now(),
        requests = []
      f.page.on('request', (r) => {
        if (/nutrition-profile|\/diary\?|meal-plans\/plan-qa/.test(r.url()))
          requests.push({ url: r.url(), startMs: Date.now() - started })
      })
      await f.goto(`/app/nutrition?tab=today&date=${date}&plan=plan-qa`)
      await visible(
        f.page.getByRole('heading', {
          name: 'Những bữa ăn của bạn',
          exact: true,
        }),
      )
      await f.page.waitForFunction(
        () =>
          !document.querySelector(
            '.nutrition-loading,.nutrition-loading-pending',
          ),
      )
      const profile = requests.find((r) => r.url.includes('nutrition-profile')),
        diary = requests.find((r) => r.url.includes('/diary?'))
      assert.ok(diary.startMs - profile.startMs < 600)
      assert.equal(f.state.counts['GET /diary'], 1)
      assert.equal(f.state.counts['GET /me/nutrition-profile'], 1)
      assert.equal(f.state.counts['GET /meal-plans/plan-qa'], 1)
      assert.ok(f.state.maxConcurrentReads <= 3)
      measurements.push({
        name: 'slow-network today',
        elapsedMs: Date.now() - started,
        requests,
        counts: counts(f),
        maxConcurrentReads: f.state.maxConcurrentReads,
      })
      await f.context.close()
    },
  )
  await check(
    'refinements server local date remains authoritative when an earlier parallel diary returns late',
    async () => {
      const f = await fixture({
        known: true,
        dayCount: 3,
        diaryDelayDate: date,
      })
      await f.page.clock.setFixedTime(new Date(`${date}T05:00:00Z`))
      f.state.profile.pregnancy.local_date = '2026-10-19'
      f.state.diaryEntries.push({
        entry_id: 'correct-day-entry',
        local_date: '2026-10-19',
        meal_type: 'LUNCH',
        recipe_id: 'rec.rice',
        name: 'Cơm trắng',
        servings: 1,
        coverage: 'COMPLETE',
        estimate_incomplete: false,
        source_plan_item_id: 'item-rice-1',
        nutrition: {},
        notes: [],
      })
      await f.context.route('**/api/v1/me/nutrition-profile', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 180))
        await route.fallback()
      })
      await f.goto(`/app/nutrition?tab=today&date=${date}&plan=plan-qa`)
      await visible(f.page.getByText('Có ghi nhật ký', { exact: true }))
      await f.page.waitForLoadState('networkidle')
      assert.ok(
        (
          await f.page
            .locator('.nutrition-banner__glass > div > p')
            .first()
            .innerText()
        ).includes('19/10/2026'),
      )
      assert.equal(await f.page.locator('.nutrition-logged-badge').count(), 1)
      assert.deepEqual(f.state.diaryDates, [date, '2026-10-19'])
      assert.equal(f.state.writes.length, 0)
      await f.context.close()
    },
  )
  await check(
    'refinements warm today and plan snapshots avoid loading flashes without extending expiry',
    async () => {
      const f = await fixture({ known: true })
      await f.page.clock.setFixedTime(new Date(`${date}T05:00:00Z`))
      await f.goto(`/app/nutrition?tab=today&date=${date}&plan=plan-qa`)
      await visible(
        f.page.getByRole('heading', {
          name: 'Những bữa ăn của bạn',
          exact: true,
        }),
      )
      await f.page.waitForLoadState('networkidle')
      const before = counts(f)
      await f.page.evaluate(() => {
        window.__nutritionFlashes = []
        new MutationObserver(() => {
          if (
            ['today', 'plan'].includes(
              new URLSearchParams(location.search).get('tab'),
            ) &&
            document.querySelector(
              '.nutrition-loading,.nutrition-loading-pending',
            )
          )
            window.__nutritionFlashes.push(location.search)
        }).observe(document.querySelector('.nutrition-content'), {
          childList: true,
          subtree: true,
        })
      })
      for (const name of ['Thực đơn', 'Khám phá', 'Hôm nay', 'Thực đơn']) {
        await tabs(f.page, name).click()
        if (name !== 'Khám phá')
          await visible(
            button(
              f.page,
              name === 'Hôm nay' ? 'Ghi đã ăn' : 'Đổi món / khẩu phần',
            ),
          )
        else
          await visible(
            f.page.getByRole('heading', {
              name: 'Khám phá món ăn',
              exact: true,
            }),
          )
      }
      assert.deepEqual(
        await f.page.evaluate(() => window.__nutritionFlashes),
        [],
      )
      assert.equal(
        f.state.counts['GET /me/nutrition-profile'],
        before['GET /me/nutrition-profile'],
      )
      assert.equal(
        f.state.counts['GET /meal-plans/plan-qa'],
        before['GET /meal-plans/plan-qa'],
      )
      assert.equal(f.state.counts['GET /diary'], before['GET /diary'])
      await tabs(f.page, 'Khám phá').click()
      await f.page.clock.setFixedTime(new Date(`${date}T05:00:16Z`))
      await tabs(f.page, 'Thực đơn').click()
      await visible(button(f.page, 'Đổi món / khẩu phần'))
      assert.equal(f.state.counts['GET /meal-plans/plan-qa'], 2)
      assert.equal(f.state.counts['GET /me/nutrition-profile'], 1)
      measurements.push({
        name: 'cached navigation without loading flash',
        before,
        after: counts(f),
        planReadsAfterExpiry: f.state.counts['GET /meal-plans/plan-qa'],
      })
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
        measurements,
        unexpected,
        pageErrors,
        consoleErrors,
        mode: process.env.NUTRITION_QA_MODE || 'development/StrictMode',
        integration: 'Contract fixtures. No live personal data writes.',
      },
      null,
      2,
    ),
  )
  await browser.close()
  await server.close()
}
