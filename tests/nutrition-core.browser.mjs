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
  chooseSelectAfterOpen,
  noOverflow,
  openEditor,
  date,
  baseProfile,
  writeFile,
} from './helpers/nutrition-browser.mjs'

try {
  await check(
    'full flow preview locked meals repeat for every day and remain distinct from saved item locks',
    async () => {
      const f = await fixture({ known: true })
      f.state.plan.days[0].slots[0].items[0].locked = true
      await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await button(f.page, 'Tạo bản xem trước khác').click()
      await chooseSelect(f.page, 'Số ngày', '3 ngày')
      await f.page
        .getByRole('checkbox', { name: /Lặp các món đang giữ của ngày/ })
        .check()
      await visible(
        f.page.getByText(
          'Món giữ cho bản xem trước áp dụng cùng bữa ở tất cả ngày. Giữ món sau khi lưu chỉ áp dụng cho món đó trong bữa và ngày đã chọn.',
          { exact: true },
        ),
      )
      await button(f.page, 'Tạo bản xem trước').click()
      await visible(button(f.page, 'Lưu và tùy chỉnh'))
      assert.deepEqual(f.state.previewBodies[0].locked_items, [
        { meal_type: 'LUNCH', sequence: 1, recipe_id: 'rec.rice', servings: 1 },
      ])
      assert.equal(f.state.previewBodies[0].day_count, 3)
      assert.equal(
        f.state.writes.filter((write) => write.method === 'PATCH').length,
        0,
      )
      await f.page
        .getByRole('navigation', { name: 'Ngày trong thực đơn' })
        .getByRole('button')
        .last()
        .click()
      await visible(button(f.page, 'Lưu và tùy chỉnh'))
      await button(f.page, 'Tạo bản xem trước mới').click()
      await visible(button(f.page, 'Lưu và tùy chỉnh'))
      assert.equal(f.state.previewBodies[1].start_date, date)
      assert.equal(f.state.previewBodies[1].day_count, 3)
      assert.deepEqual(
        f.state.previewBodies[1].locked_items,
        f.state.previewBodies[0].locked_items,
      )
      await f.context.close()
    },
  )
  await check(
    'full flow late diary date responses cannot overwrite the selected day and account reload clears diary',
    async () => {
      const f = await fixture({ diaryDelayDate: date })
      f.state.diaryEntries = [
        {
          entry_id: 'private-old',
          local_date: date,
          meal_type: 'LUNCH',
          name: 'Món riêng ngày trước',
          custom_text: 'Món riêng ngày trước',
          amount_text: 'Một bát',
          nutrition: {},
          coverage: 'PARTIAL',
          estimate_incomplete: false,
          notes: [],
        },
      ]
      const started = f.page.waitForRequest((request) =>
        request.url().endsWith(`/diary?date=${date}`),
      )
      await f.goto(`/app/nutrition?tab=diary&date=${date}`)
      await started
      await f.page
        .getByLabel('Ngày nhật ký', { exact: true })
        .fill('2026-10-19')
      await visible(
        f.page.getByRole('heading', { name: 'Chưa có món nào được ghi' }),
      )
      // Wait past the intentionally delayed old-day response to assert the read race.
      await f.page.waitForTimeout(800)
      assert.equal(
        await f.page
          .getByRole('heading', { name: 'Món riêng ngày trước', exact: true })
          .count(),
        0,
      )
      assert.equal(
        await f.page.getByLabel('Ngày nhật ký', { exact: true }).inputValue(),
        '2026-10-19',
      )
      f.state.diaryDelayDate = null
      await f.page.getByLabel('Ngày nhật ký', { exact: true }).fill(date)
      await visible(
        f.page.getByRole('heading', {
          name: 'Món riêng ngày trước',
          exact: true,
        }),
      )
      f.state.accountB = true
      await f.page.evaluate(() => {
        const current = JSON.parse(
          sessionStorage.getItem('nutrimom.auth-session'),
        )
        current.user.id = 'nutrition-account-b'
        sessionStorage.setItem('nutrimom.auth-session', JSON.stringify(current))
      })
      await f.page.reload()
      await visible(
        f.page.getByRole('heading', { name: 'Chưa có món nào được ghi' }),
      )
      assert.equal(
        await f.page
          .getByRole('heading', { name: 'Món riêng ngày trước', exact: true })
          .count(),
        0,
      )
      assert.equal(await f.page.getByRole('dialog').count(), 0)
      await f.context.close()
    },
  )
  await check(
    'full flow upgrade is displayed only after a server rejection and preserves create choices',
    async () => {
      const f = await fixture({ upgradeRequired: true })
      await f.goto(`/app/nutrition?tab=plan&date=${date}`)
      assert.equal(await f.page.getByRole('dialog').count(), 0)
      await chooseSelect(f.page, 'Số ngày', '7 ngày')
      await button(f.page, 'Tạo bản xem trước').click()
      await visible(
        f.page.getByRole('dialog', { name: 'Mở quyền lợi này', exact: true }),
      )
      await f.page
        .getByRole('link', { name: 'Xem gói phù hợp', exact: false })
        .waitFor()
      await button(f.page, 'Để sau').click()
      assert.ok(
        (await button(f.page, 'Số ngày').innerText()).includes('7 ngày'),
      )
      assert.equal(f.state.counts['POST /meal-plans'] || 0, 0)
      await f.context.close()
    },
  )
  await check(
    'full flow multi-day preview save day URL restore and scoped shopping for 1 3 7 days',
    async () => {
      for (const count of [1, 3, 7]) {
        const f = await fixture()
        await f.goto(`/app/nutrition?tab=plan&date=${date}`)
        await chooseSelect(f.page, 'Số ngày', `${count} ngày`)
        await f.page
          .getByLabel('Ngày bắt đầu', { exact: true })
          .fill('2026-10-20')
        await button(f.page, 'Tạo bản xem trước').click()
        await visible(button(f.page, 'Lưu và tùy chỉnh'))
        assert.equal(f.state.previewBodies[0].day_count, count)
        assert.equal(f.state.previewBodies[0].start_date, '2026-10-20')
        assert.equal(f.state.counts['POST /meal-plans'] || 0, 0)
        assert.equal(f.state.plan.days.length, count)
        if (count > 1) {
          await f.page
            .getByRole('navigation', { name: 'Ngày trong thực đơn' })
            .getByRole('button')
            .last()
            .click()
          assert.ok(f.page.url().includes(`date=${f.state.plan.end_date}`))
          await visible(button(f.page, 'Lưu và tùy chỉnh'))
        }
        await button(f.page, 'Lưu và tùy chỉnh').click()
        await visible(f.page.getByRole('heading', { name: 'Thực đơn đã lưu' }))
        assert.equal(f.state.counts['POST /meal-plans'], 1)
        await f.page.reload()
        await visible(f.page.getByRole('heading', { name: 'Thực đơn đã lưu' }))
        if (count > 1) {
          const nav = f.page.getByRole('navigation', {
            name: 'Ngày trong thực đơn',
          })
          await nav.getByRole('button').first().click()
          assert.ok(f.page.url().includes('date=2026-10-20'))
          await f.page.goBack()
          await visible(
            f.page.getByRole('heading', { name: 'Thực đơn đã lưu' }),
          )
          assert.ok(f.page.url().includes(`date=${f.state.plan.end_date}`))
        }
        await f.page.getByRole('link', { name: 'Mua sắm', exact: true }).click()
        await visible(
          f.page.getByRole('heading', { name: 'Gạo tẻ', exact: true }),
        )
        assert.ok(
          f.state.shoppingQuery.includes(`end_date=${f.state.plan.end_date}`),
        )
        if (count > 1) {
          await f.page
            .getByLabel('Mua đến ngày', { exact: true })
            .fill('2026-10-21')
          await chooseSelect(f.page, 'Hiển thị', 'Còn cần mua')
          await button(f.page, 'Làm mới danh sách').click()
          await visible(
            f.page.getByRole('heading', { name: 'Gạo tẻ', exact: true }),
          )
          assert.ok(f.state.shoppingQuery.includes('end_date=2026-10-21'))
          assert.ok(
            await button(f.page, 'Hiển thị')
              .innerText()
              .then((text) => text.includes('Còn cần mua')),
          )
        }
        await noOverflow(f.page)
        await f.context.close()
      }
    },
  )
  await check(
    'full flow cooking half planned servings diary snapshots edit move feedback custom and delete',
    async () => {
      const f = await fixture({ known: true, plannedServings: 2 })
      await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await f.page
        .getByRole('link', { name: 'Xem cách nấu', exact: true })
        .click()
      await button(f.page, 'Bắt đầu chế độ nấu').click()
      await button(f.page, 'Bước tiếp theo').click()
      await button(f.page, 'Bước tiếp theo').click()
      await button(f.page, 'Kết thúc hướng dẫn').click()
      await button(f.page, 'Đã ăn món này').click()
      await f.page
        .getByRole('button', { name: 'Ăn một nửa', exact: false })
        .click()
      assert.equal(
        await f.page.getByLabel('Số phần đã ăn', { exact: true }).inputValue(),
        '1',
      )
      assert.equal(f.state.counts['POST /diary-entries'] || 0, 0)
      await button(f.page, 'Xác nhận ghi nhật ký').click()
      await visible(
        f.page.getByRole('heading', {
          name: 'Tổng của các món đã ghi',
          exact: true,
        }),
      )
      assert.equal(f.state.diaryEntries.length, 1)
      assert.equal(f.state.diaryEntries[0].servings, 1)
      assert.equal(f.state.diaryEntries[0].source_plan_item_id, 'item-rice')
      assert.equal(f.state.plan.days[0].slots[0].items[0].servings, 2)
      assert.ok(
        (
          await f.page
            .locator('.nutrition-diary-totals > section')
            .nth(1)
            .innerText()
        ).includes('270 kcal'),
      )
      assert.ok(
        (
          await f.page
            .locator('.nutrition-diary-totals > section')
            .nth(2)
            .innerText()
        ).includes('1.234 kcal'),
      )
      for (const label of ['Hợp khẩu vị', 'Không thích', 'Khó ăn lúc này'])
        await button(f.page, label).click()
      await visible(f.page.getByText(/Đã ghi nhận khó ăn tạm thời đến/))
      assert.deepEqual(
        f.state.writes
          .filter((write) => write.path === '/meal-feedback')
          .map((write) => write.body.type),
        ['TASTY', 'DISLIKE', 'HARD_NOW'],
      )
      await button(f.page, 'Sửa món đã ghi').click()
      await f.page.getByLabel('Số phần đã ăn', { exact: true }).fill('0.75')
      await button(f.page, 'Lưu thay đổi nhật ký').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      const patch = f.state.writes
        .filter(
          (write) =>
            write.method === 'PATCH' &&
            write.path.startsWith('/diary-entries/'),
        )
        .at(-1).body
      assert.deepEqual(patch, { servings: 0.75 })
      assert.equal(f.state.diaryEntries[0].recipe_version, 1)
      await button(f.page, 'Sửa món đã ghi').click()
      await f.page.getByLabel('Ngày đã ăn', { exact: true }).fill('2026-10-19')
      const refreshedSource = f.page.waitForResponse((response) =>
        response.url().endsWith(`/diary?date=${date}`),
      )
      await button(f.page, 'Lưu thay đổi nhật ký').click()
      await refreshedSource
      await f.page.waitForURL('**/app/nutrition?tab=diary&date=2026-10-19')
      await visible(button(f.page, 'Sửa món đã ghi'))
      assert.ok(f.state.diaryDates.includes(date))
      assert.equal(
        await f.page.getByLabel('Ngày nhật ký', { exact: true }).inputValue(),
        '2026-10-19',
      )
      assert.equal(f.state.diaryEntries[0].local_date, '2026-10-19')
      await button(f.page, 'Sửa món đã ghi').click()
      await button(f.page, 'Chọn món / biến thể khác').click()
      await button(f.page, 'Trang món tiếp theo').click()
      await f.page
        .getByRole('dialog')
        .getByRole('button', { name: 'Cơm gạo lứt', exact: true })
        .click()
      await f.page
        .getByLabel('Nguyên liệu thay đổi đáng kể / ước tính chưa đầy đủ', {
          exact: true,
        })
        .check()
      await button(f.page, 'Lưu thay đổi nhật ký').click()
      await visible(
        f.page.getByRole('heading', { name: 'Cơm gạo lứt', exact: true }),
      )
      assert.equal(f.state.diaryEntries[0].source_plan_item_id, null)
      assert.equal(f.state.diaryEntries[0].estimate_incomplete, true)
      const remainingText = await f.page
        .locator('.nutrition-diary-totals > section')
        .nth(2)
        .innerText()
      assert.ok(remainingText.includes('Chưa đủ dữ liệu'))
      assert.equal(remainingText.includes('1.234 kcal'), false)
      await button(f.page, 'Xóa món đã ghi').click()
      await button(f.page, 'Xác nhận xóa nhật ký').click()
      await visible(
        f.page.getByRole('heading', { name: 'Chưa có món nào được ghi' }),
      )
      await button(f.page, '+ Ghi món tự nhập').click()
      await f.page
        .getByLabel('Tên món tự nhập', { exact: true })
        .fill('Bánh nhà làm')
      await f.page
        .getByLabel('Lượng đã ăn (mô tả)', { exact: true })
        .fill('Một miếng nhỏ')
      await button(f.page, 'Xác nhận ghi nhật ký').click()
      await visible(
        f.page.getByRole('heading', { name: 'Bánh nhà làm', exact: true }),
      )
      const customBody = f.state.writes
        .filter((write) => write.path === '/diary-entries')
        .at(-1).body
      assert.equal('servings' in customBody, false)
      assert.equal('recipe_id' in customBody, false)
      await button(f.page, 'Sửa món đã ghi').click()
      await f.page.getByLabel('Lượng đã ăn (mô tả)', { exact: true }).fill('')
      await button(f.page, 'Lưu thay đổi nhật ký').click()
      await visible(f.page.getByText('Chưa mô tả lượng', { exact: true }))
      await f.page.setViewportSize({ width: 390, height: 960 })
      await noOverflow(f.page)
      await f.page.screenshot({
        path: `${output}/diary-mobile.png`,
        fullPage: true,
      })
      await f.context.close()
    },
  )
  await check(
    'full flow diary create retry stable request id and catalog outside plan',
    async () => {
      const f = await fixture({ diaryRetryOnce: true })
      await f.goto(`/app/nutrition?tab=explore&date=${date}`)
      await button(f.page, 'Đã ăn món này').click()
      await f.page.getByLabel('Số phần đã ăn', { exact: true }).fill('1.5')
      await button(f.page, 'Xác nhận ghi nhật ký').click()
      await visible(button(f.page, 'Thử lại lần ghi này'))
      assert.equal(
        await f.page.getByLabel('Số phần đã ăn', { exact: true }).isDisabled(),
        true,
      )
      await button(f.page, 'Thử lại lần ghi này').click()
      await visible(button(f.page, 'Sửa món đã ghi'))
      const bodies = f.state.writes
        .filter((write) => write.path === '/diary-entries')
        .map((write) => write.body)
      assert.deepEqual(bodies[0], bodies[1])
      assert.equal(f.state.diaryEntries.length, 1)
      assert.equal('source_plan_item_id' in bodies[0], false)
      await f.context.close()
    },
  )
  await check(
    'full flow regenerate delegates eaten meal protection to BE without reading diary',
    async () => {
      const f = await fixture({ known: true, dayCount: 3 })
      f.state.diaryEntries.push({
        entry_id: 'other-day',
        local_date: '2026-10-20',
        source_plan_item_id: 'item-rice-2',
        recipe_id: 'rec.rice',
        name: 'Cơm trắng',
        meal_type: 'LUNCH',
        servings: 1,
        nutrition: {},
        coverage: 'COMPLETE',
        notes: [],
        estimate_incomplete: false,
      })
      await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await f.page.locator('.nutrition-plan-tools > summary').click()
      await button(f.page, 'Tạo lại món chưa giữ').click()
      await visible(f.page.getByText(/Các bữa đã ghi nhật ký được giữ nguyên/))
      assert.equal(await button(f.page, 'Xác nhận tạo lại').isDisabled(), false)
      assert.equal(f.state.diaryDates.length, 0)
      await button(f.page, 'Hủy').click()
      await openEditor(f.page)
      await button(f.page, 'Thay món này').click()
      await visible(
        f.page.getByRole('heading', { name: 'Cơm gạo lứt', exact: true }),
      )
      assert.equal(
        f.state.counts['POST /meal-plans/plan-qa/regenerate'] || 0,
        0,
      )
      const history = structuredClone(f.state.diaryEntries)
      const eaten = structuredClone(f.state.plan.days[2].slots)
      f.state.diaryFailDate = '2026-10-20'
      await button(f.page, 'Tạo lại món chưa giữ').click()
      assert.equal(await button(f.page, 'Xác nhận tạo lại').isDisabled(), false)
      await button(f.page, 'Xác nhận tạo lại').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      await visible(
        f.page.getByText(
          'Các bữa đã ghi nhật ký được giữ nguyên khi tạo lại thực đơn.',
        ),
      )
      assert.equal(f.state.counts['POST /meal-plans/plan-qa/regenerate'], 1)
      assert.deepEqual(f.state.diaryEntries, history)
      assert.deepEqual(f.state.plan.days[2].slots, eaten)
      assert.equal(f.state.diaryDates.length, 0)
      await f.context.close()
    },
  )
  await check(
    'nutrition selects unfold and fold with animation, keyboard and mobile dialog support',
    async () => {
      const f = await fixture({ reducedMotion: 'no-preference' })
      await f.goto(`/app/nutrition?tab=explore&date=${date}`)
      await visible(button(f.page, 'Bữa ăn'))
      async function toggleFrames(label) {
        return button(f.page, label).evaluate(async (node) => {
          node.click()
          const heights = []
          for (let i = 0; i < 25; i++) {
            await new Promise(requestAnimationFrame)
            heights.push(
              node
                .closest('.nutrition-select')
                .querySelector('[role="listbox"]')
                ?.getBoundingClientRect().height || 0,
            )
          }
          return heights
        })
      }
      const opening = await toggleFrames('Bữa ăn')
      const fullHeight = Math.max(...opening)
      assert.ok(fullHeight > 100)
      assert.ok(
        opening.some((height) => height > 1 && height < fullHeight - 2),
        'Opening must include intermediate heights',
      )
      await f.page.screenshot({
        path: `${output}/dropdown-explore-open.png`,
        fullPage: false,
      })
      const closing = await toggleFrames('Bữa ăn')
      assert.ok(
        closing.some((height) => height > 1 && height < fullHeight - 2),
        'Closing must roll up before removal',
      )
      await f.page
        .getByRole('listbox', { name: 'Bữa ăn', exact: true })
        .waitFor({ state: 'hidden' })
      await chooseSelect(f.page, 'Bữa ăn', 'Bữa trưa')
      await chooseSelect(f.page, 'Vai trò', 'Tinh bột')
      await chooseSelect(f.page, 'Thời gian nấu', 'Tối đa 30 phút')
      assert.ok(f.page.url().includes('meal=LUNCH'))
      assert.ok(f.page.url().includes('role=STAPLE'))
      await button(f.page, 'Bữa ăn').focus()
      await f.page.keyboard.press('ArrowDown')
      await visible(
        f.page.getByRole('listbox', { name: 'Bữa ăn', exact: true }),
      )
      await f.page.keyboard.press('Tab')
      assert.equal(
        await button(f.page, 'Vai trò').evaluate(
          (node) => document.activeElement === node,
        ),
        true,
      )
      await f.page.getByRole('listbox').waitFor({ state: 'hidden' })
      await button(f.page, 'Thời gian nấu').click()
      await f.page.getByRole('heading', { name: 'Khám phá món ăn' }).click()
      await f.page.getByRole('listbox').waitFor({ state: 'hidden' })
      await f.page.setViewportSize({ width: 360, height: 960 })
      await button(f.page, 'Hồ sơ ăn uống').click()
      await button(f.page, 'Tiếp tục').click()
      await button(f.page, 'Lưu và tiếp tục').click()
      await chooseSelect(f.page, 'Chế độ ăn', 'Chay có trứng và sữa')
      await button(f.page, 'Bỏ qua').click()
      await f.page
        .getByRole('dialog')
        .getByLabel('Bữa phụ', { exact: true })
        .check()
      await chooseSelect(f.page, 'Số bữa phụ', '2')
      await button(f.page, 'Lưu và tiếp tục').click()
      await button(f.page, 'Nhóm vận động (tự ước lượng)').click()
      await visible(
        f.page.getByRole('option', { name: 'Vận động nhiều', exact: true }),
      )
      await f.page.waitForFunction(() => {
        const menu = document.querySelector(
          '.nutrition-dialog [role="listbox"]',
        )
        const body = document.querySelector('.nutrition-dialog .nm-dialog-body')
        if (!menu || !body) return false
        const bounds = menu.getBoundingClientRect(),
          frame = body.getBoundingClientRect()
        return (
          bounds.height > 150 &&
          bounds.top >= frame.top &&
          bounds.bottom <= frame.bottom
        )
      })
      await noOverflow(f.page)
      await f.page.screenshot({
        path: `${output}/dropdown-profile-mobile.png`,
        fullPage: false,
      })
      await f.page.keyboard.press('Escape')
      assert.equal(await f.page.getByRole('dialog').count(), 1)
      await chooseSelect(f.page, 'Nhóm vận động (tự ước lượng)', 'Vận động nhẹ')
      await button(f.page, 'Để sau').click()
      await f.context.close()
      const saved = await fixture({ known: true })
      await saved.page.setViewportSize({ width: 390, height: 960 })
      await saved.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await chooseSelect(saved.page, 'Mở thực đơn đã biết', date)
      await openEditor(saved.page)
      await button(saved.page, 'Đơn vị').click()
      await saved.page.screenshot({
        path: `${output}/dropdown-sheet-mobile.png`,
        fullPage: false,
      })
      await chooseSelectAfterOpen(saved.page, 'Đơn vị', 'Gram món chín')
      await visible(saved.page.getByLabel('Lượng món chín (g)'))
      await saved.page.keyboard.press('Escape')
      await saved.page
        .getByRole('link', { name: 'Mua sắm', exact: true })
        .click()
      await chooseSelect(saved.page, 'Hiển thị', 'Đã mua')
      await visible(
        saved.page.getByRole('heading', {
          name: 'Không có dòng nào trong lựa chọn này',
        }),
      )
      await chooseSelect(saved.page, 'Hiển thị', 'Tất cả')
      await visible(
        saved.page.getByRole('heading', { name: 'Gạo tẻ', exact: true }),
      )
      assert.equal(
        await saved.page
          .locator('.nutrition-page select, .nutrition-dialog select')
          .count(),
        0,
      )
      await saved.context.close()
      const draft = await fixture()
      await draft.goto(`/app/nutrition?tab=plan&date=${date}`)
      await draft.page.getByLabel('Bữa phụ', { exact: true }).check()
      await chooseSelect(draft.page, 'Số bữa phụ', '3')
      await button(draft.page, 'Tạo bản xem trước').click()
      await visible(button(draft.page, 'Lưu và tùy chỉnh'))
      assert.equal(draft.state.previewBodies[0].snack_count, 3)
      await draft.context.close()
    },
  )
  await check(
    'onboarding skips optional data and UNKNOWN gates saving without selecting an allergy automatically',
    async () => {
      const f = await fixture({
        profile: {
          profile_version: 0,
          allergy_status: 'UNKNOWN',
          needs_allergy_confirmation: true,
        },
      })
      await f.goto('/app/nutrition')
      await button(f.page, 'Thiết lập hồ sơ ăn uống').click()
      await button(f.page, 'Tiếp tục').click()
      assert.equal(
        await f.page.getByRole('radio', { checked: true }).count(),
        0,
      )
      await f.page.getByRole('radio', { name: 'Chưa rõ', exact: true }).check()
      await button(f.page, 'Lưu và tiếp tục').click()
      await button(f.page, 'Bỏ qua').click()
      await button(f.page, 'Lưu và tiếp tục').click()
      await button(f.page, 'Để sau').click()
      const saves = f.state.writes.filter(
        (write) => write.path === '/me/nutrition-profile',
      )
      assert.equal(saves.length, 2)
      assert.deepEqual(saves[0].body, {
        allergy_status: 'UNKNOWN',
        allergen_ids: [],
      })
      assert.equal('allergen_ids' in saves[1].body, false)
      assert.equal('height_cm' in saves[1].body, false)
      await f.page
        .getByRole('link', { name: 'Tạo thực đơn hôm nay', exact: true })
        .click()
      await button(f.page, 'Tạo bản xem trước').click()
      await button(f.page, 'Lưu và tùy chỉnh').click()
      await visible(f.page.getByRole('dialog', { name: 'Hồ sơ ăn uống' }))
      assert.equal(f.state.counts['POST /meal-plans'] || 0, 0)
      await f.context.close()
    },
  )
  await check(
    'preview retry preserves payload, no edits before explicit save, all saved edit operations use current versions',
    async () => {
      const f = await fixture({ retryOnce: true })
      await f.goto(`/app/nutrition?tab=plan&date=${date}`)
      await button(f.page, 'Tạo bản xem trước').evaluate((node) => {
        node.click()
        node.click()
      })
      await button(f.page, 'Thử lại yêu cầu vừa gửi').click()
      await visible(button(f.page, 'Lưu và tùy chỉnh'))
      assert.equal(f.state.previewBodies.length, 2)
      assert.deepEqual(f.state.previewBodies[0], f.state.previewBodies[1])
      assert.equal(
        await f.page
          .getByRole('button', { name: 'Đổi món / khẩu phần' })
          .count(),
        0,
      )
      assert.equal(
        await f.page.locator('.nutrition-summary progress').count(),
        0,
      )
      assert.equal(
        (await f.page.locator('.nutrition-summary').innerText()).includes(
          '2.000',
        ),
        false,
      )
      await button(f.page, 'Lưu và tùy chỉnh').click()
      await openEditor(f.page)
      assert.equal(
        await f.page
          .getByRole('button', { name: '0,5 phần', exact: true })
          .count(),
        0,
      )
      await button(f.page, 'Thay món này').click()
      await visible(
        f.page.getByRole('heading', { name: 'Cơm gạo lứt', exact: true }),
      )
      assert.ok(
        (await f.page.locator('.nutrition-values').innerText()).includes(
          '777,7',
        ),
      )
      await button(f.page, 'Giữ món').click()
      await visible(button(f.page, 'Bỏ giữ'))
      await openEditor(f.page)
      await button(f.page, '1,25 phần').click()
      await button(f.page, 'Cập nhật khẩu phần').click()
      await openEditor(f.page)
      await chooseSelect(f.page, 'Đơn vị', 'Gram món chín')
      await f.page.getByLabel('Lượng món chín (g)').fill('225')
      await button(f.page, 'Cập nhật khẩu phần').click()
      await button(f.page, 'Tạo lại món chưa giữ').click()
      await button(f.page, 'Xác nhận tạo lại').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      await button(f.page, 'Hoàn tác thao tác gần nhất').click()
      assert.equal(f.state.plan.days[0].slots[0].items[0].locked, true)
      await f.page.reload()
      await visible(f.page.getByRole('heading', { name: 'Thực đơn đã lưu' }))
      assert.equal(f.state.counts['POST /meal-plans'], 1)
      assert.ok(
        await f.page.evaluate(
          (key) => localStorage.getItem(key)?.includes('plan-qa'),
          `nutrimom.nutrition.plans.v1:${user.id}`,
        ),
      )
      await f.context.close()
    },
  )
  await check(
    '409 closes stale choices and reloads without replaying a write',
    async () => {
      const f = await fixture({ known: true, conflictOnce: true })
      await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await openEditor(f.page)
      await button(f.page, 'Thay món này').click()
      await visible(
        f.page.getByText(
          'Dữ liệu đã thay đổi. Đã yêu cầu tải lại hồ sơ và thực đơn; hãy chọn lại thao tác.',
          { exact: true },
        ),
      )
      assert.equal(await f.page.getByRole('dialog').count(), 0)
      assert.equal(
        f.state.counts['PATCH /meal-plans/plan-qa/items/item-rice'],
        1,
      )
      assert.ok(f.state.counts['GET /meal-plans/plan-qa'] >= 2)
      assert.ok(f.state.counts['GET /me/nutrition-profile'] >= 2)
      await f.context.close()
    },
  )
  await check(
    'expiry, NO_MATCH and field validation have actionable states',
    async () => {
      const expiry = await fixture({ shortExpiry: true })
      await expiry.goto(`/app/nutrition?tab=plan&date=${date}`)
      await button(expiry.page, 'Tạo bản xem trước').click()
      await visible(
        expiry.page.getByText(
          'Bản xem trước đã hết hạn. Tạo lại với các lựa chọn ở trên để tiếp tục.',
          { exact: true },
        ),
      )
      assert.equal(
        await button(expiry.page, 'Lưu và tùy chỉnh').isDisabled(),
        true,
      )
      assert.equal(
        await expiry.page
          .getByLabel('Ngân sách ngày (VND, tùy chọn)')
          .inputValue(),
        '120000',
      )
      await expiry.context.close()
      const f = await fixture({ noMatch: true })
      await f.goto(`/app/nutrition?tab=plan&date=${date}`)
      await button(f.page, 'Tạo bản xem trước').click()
      await visible(
        f.page.getByText(
          'Bữa trưa · tinh bột: không còn món trong thời gian đã chọn.',
          { exact: true },
        ),
      )
      assert.equal(await button(f.page, 'Lưu và tùy chỉnh').count(), 0)
      await f.context.close()
      const invalid = await fixture({ previewValidation: true })
      await invalid.goto(`/app/nutrition?tab=plan&date=${date}`)
      await button(invalid.page, 'Tạo bản xem trước').click()
      await visible(
        invalid.page
          .getByRole('alert')
          .getByText('Chọn ít nhất một bữa', { exact: true }),
      )
      await invalid.context.close()
    },
  )
  await check(
    'shopping keeps purchase state after plan change, uses backend totals, exclusions and custom CRUD',
    async () => {
      const f = await fixture({ known: true })
      await f.goto(`/app/nutrition/shopping/plan-qa?tab=plan&date=${date}`)
      await visible(
        f.page.getByRole('heading', { name: 'Gạo tẻ', exact: true }),
      )
      assert.equal(await f.page.locator('.nutrition-shopping-item').count(), 2)
      const raw = f.page.locator('.nutrition-shopping-item').filter({
        has: f.page.getByRole('heading', { name: 'Gạo tẻ', exact: true }),
      })
      assert.equal(
        await raw
          .getByRole('button', { name: 'Xóa dòng', exact: true })
          .count(),
        0,
      )
      await raw
        .getByRole('button', { name: 'Đánh dấu đã mua', exact: true })
        .click()
      await visible(
        raw.getByRole('button', { name: 'Bỏ đánh dấu đã mua', exact: true }),
      )
      f.state.plan.plan_version++
      await button(f.page, 'Làm mới danh sách').click()
      await visible(
        raw
          .getByText('Cần thêm sau khi thực đơn thay đổi.', { exact: true })
          .first(),
      )
      assert.ok(
        (
          await raw.locator('.nutrition-shopping-row-summary').innerText()
        ).includes('Còn mua 200 g'),
      )
      assert.equal(
        await raw
          .getByRole('button', { name: 'Bỏ đánh dấu đã mua', exact: true })
          .count(),
        1,
      )
      assert.ok(
        (await f.page.locator('.nutrition-summary').innerText()).includes(
          '9.137',
        ),
      )
      await button(f.page, '+ Thêm dòng tự nhập').click()
      await f.page.getByLabel('Nội dung', { exact: true }).fill('Giấy ăn')
      await f.page.getByLabel('Số lượng (tùy chọn)').fill('2')
      await f.page.getByLabel('Đơn vị (tùy chọn)').fill('gói')
      await button(f.page, 'Thêm vào danh sách').click()
      const custom = f.page.locator('.nutrition-shopping-item').filter({
        has: f.page.getByRole('heading', { name: 'Giấy ăn', exact: true }),
      })
      await custom.locator('details > summary').click()
      await custom
        .getByRole('button', { name: 'Chỉnh lượng / nội dung', exact: true })
        .click()
      await f.page.getByLabel('Nội dung', { exact: true }).fill('Khăn giấy')
      await f.page.getByLabel('Lượng đã có (gói)').fill('1')
      await button(f.page, 'Lưu thay đổi').click()
      await visible(
        f.page.getByRole('heading', { name: 'Khăn giấy', exact: true }),
      )
      await button(f.page, 'Xóa dòng').click()
      await button(f.page, 'Xác nhận xóa').click()
      await f.page
        .getByRole('heading', { name: 'Khăn giấy', exact: true })
        .waitFor({ state: 'hidden' })
      await button(f.page, 'Chọn phạm vi và món cần mua nguyên liệu').click()
      await f.page.getByLabel('Cơm trắng', { exact: true }).click()
      assert.equal(
        await f.page.getByLabel('Cơm trắng', { exact: true }).isChecked(),
        false,
      )
      await button(f.page, 'Áp dụng lựa chọn').click()
      await f.page
        .getByRole('dialog', { name: 'Chọn nguyên liệu cần mua', exact: true })
        .waitFor({ state: 'hidden' })
      await visible(
        f.page.getByRole('heading', {
          name: 'Không có dòng nào trong lựa chọn này',
        }),
      )
      assert.ok(f.state.shoppingQuery.includes('exclude_item_ids=item-rice'))
      await button(f.page, 'Làm mới danh sách').click()
      assert.ok(f.page.url().includes('exclude_item_ids=item-rice'))
      await f.context.close()
    },
  )
  await check(
    'catalog cursor filters, direct recipe cooking mode, favorite merging and diary honesty',
    async () => {
      const f = await fixture()
      await f.goto(`/app/nutrition?tab=explore&date=${date}`)
      await chooseSelect(f.page, 'Bữa ăn', 'Bữa trưa')
      await chooseSelect(f.page, 'Thời gian nấu', 'Tối đa 30 phút')
      await button(f.page, 'Xem thêm món').click()
      await visible(
        f.page.getByRole('heading', { name: 'Cơm gạo lứt', exact: true }),
      )
      assert.ok(f.state.catalogQuery.includes('mealType=LUNCH'))
      assert.ok(f.state.catalogQuery.includes('maxMinutes=30'))
      assert.ok(f.state.catalogQuery.includes('cursor=rec.rice'))
      await f.page.getByRole('link', { name: 'Cơm trắng', exact: true }).click()
      await button(f.page, 'Bắt đầu chế độ nấu').click()
      await button(f.page, 'Bước tiếp theo').click()
      await visible(
        f.page
          .locator('.nutrition-cooking')
          .getByText('Nấu chín hoàn toàn.', { exact: true }),
      )
      await button(f.page, 'Yêu thích món này').click()
      await visible(button(f.page, 'Bỏ yêu thích'))
      assert.deepEqual(
        f.state.writes
          .filter((write) => write.path === '/me/nutrition-profile')
          .at(-1).body,
        { favorite_recipe_ids: ['rec.other', 'rec.rice'] },
      )
      await f.page.goBack()
      await visible(f.page.getByRole('heading', { name: 'Khám phá món ăn' }))
      await f.page.getByRole('link', { name: 'Nhật ký', exact: true }).click()
      await visible(
        f.page.getByRole('heading', {
          name: 'Nhật ký ăn uống',
          exact: true,
        }),
      )
      assert.equal(await button(f.page, 'Đã ăn').count(), 0)
      await f.context.close()
    },
  )
  await check(
    'paused pregnancy blocks writes while soft profile changes leave plan editable',
    async () => {
      const f = await fixture({
        known: true,
        profile: {
          pregnancy: { ...baseProfile.pregnancy, auto_plan_paused: true },
        },
      })
      await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await f.page.locator('.nutrition-plan-tools > summary').click()
      await visible(button(f.page, 'Tạo lại món chưa giữ'))
      assert.equal(
        await button(f.page, 'Tạo lại món chưa giữ').isDisabled(),
        true,
      )
      await f.page.getByRole('link', { name: 'Khám phá', exact: true }).click()
      await visible(
        f.page.getByRole('heading', { name: 'Cơm trắng', exact: true }),
      )
      await f.context.close()
      const changed = await fixture({ known: true })
      changed.state.profile.profile_version++
      await changed.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await changed.page.locator('.nutrition-plan-tools > summary').click()
      await visible(
        changed.page.getByText('Hồ sơ đã được cập nhật', { exact: true }),
      )
      assert.equal(
        await button(changed.page, 'Tạo lại món chưa giữ').isDisabled(),
        false,
      )
      await changed.context.close()
    },
  )
  await check(
    'account change never reads previous account index and old deep links return no personal content',
    async () => {
      const f = await fixture({ known: true })
      await f.goto('/app/nutrition')
      await visible(
        f.page.getByRole('heading', { name: 'Cơm trắng', exact: true }),
      )
      f.state.accountB = true
      await f.page.evaluate(() => {
        const current = JSON.parse(
          sessionStorage.getItem('nutrimom.auth-session'),
        )
        current.user.id = 'nutrition-account-b'
        sessionStorage.setItem('nutrimom.auth-session', JSON.stringify(current))
      })
      const count = f.state.counts['GET /meal-plans/plan-qa']
      await f.page.reload()
      await visible(
        f.page.getByRole('heading', { name: 'Hôm nay bạn muốn ăn gì?' }),
      )
      assert.equal(f.state.counts['GET /meal-plans/plan-qa'], count)
      await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await visible(f.page.getByRole('alert'))
      assert.equal(await f.page.locator('.nutrition-plan-item').count(), 0)
      await f.context.close()
    },
  )
  await check(
    'stable reads do not refetch on unrelated interaction and no pregnancy still permits recipe browsing',
    async () => {
      const f = await fixture()
      await f.goto('/app/nutrition')
      await visible(
        f.page.getByRole('heading', { name: 'Một vài gợi ý để bắt đầu' }),
      )
      await visible(f.page.locator('.nutrition-suggestions article').last())
      assert.equal(f.state.counts['GET /me/nutrition-profile'], 1)
      assert.equal(f.state.counts['POST /recommendations'], 1)
      assert.equal(
        await f.page.locator('.nutrition-suggestions article').count(),
        3,
      )
      await button(f.page, 'Hồ sơ ăn uống').click()
      await f.page.keyboard.press('Escape')
      assert.equal(f.state.counts['POST /recommendations'], 1)
      await f.context.close()
      const missing = await fixture({ noPregnancy: true })
      await missing.goto(`/app/nutrition?tab=explore&date=${date}`)
      await visible(
        missing.page.getByRole('heading', { name: 'Cơm trắng', exact: true }),
      )
      await missing.page
        .getByRole('link', { name: 'Cơm trắng', exact: true })
        .click()
      await visible(button(missing.page, 'Bắt đầu chế độ nấu'))
      await missing.context.close()
    },
  )
  await check(
    'server expiry keeps inputs and gram entry is absent without a conversion basis',
    async () => {
      const f = await fixture({ saveConflict: true })
      await f.goto(`/app/nutrition?tab=plan&date=${date}`)
      await button(f.page, 'Tạo bản xem trước').click()
      await button(f.page, 'Lưu và tùy chỉnh').click()
      await visible(
        f.page.getByText(
          'Bản xem trước đã hết hạn hoặc dữ liệu đã thay đổi. Hãy tạo lại với lựa chọn hiện tại rồi lưu.',
          { exact: true },
        ),
      )
      assert.equal(f.state.counts['POST /meal-plans'], 1)
      assert.equal(
        await f.page.getByLabel('Ngân sách ngày (VND, tùy chọn)').inputValue(),
        '120000',
      )
      await visible(button(f.page, 'Tạo bản xem trước'))
      await f.context.close()
      const noGram = await fixture({ known: true, noGrams: true })
      await noGram.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
      await openEditor(noGram.page)
      await button(noGram.page, 'Đơn vị').click()
      assert.equal(
        await noGram.page
          .getByRole('option', { name: 'Gram món chín', exact: true })
          .count(),
        0,
      )
      await noGram.context.close()
    },
  )
  if (process.env.NUTRITION_LIVE_CATALOG === '1')
    await check(
      'real local catalog UI loads recipes and detail through the existing proxy (auth shell fixture)',
      async () => {
        const f = await fixture({ realCatalog: true })
        await f.goto(`/app/nutrition?tab=explore&date=${date}`)
        await visible(f.page.locator('.nutrition-recipe-card').first())
        const name = await f.page
          .locator('.nutrition-recipe-card h3')
          .first()
          .innerText()
        await f.page.locator('.nutrition-recipe-card h3 a').first().click()
        await visible(f.page.getByRole('heading', { name, exact: true }))
        await visible(button(f.page, 'Bắt đầu chế độ nấu'))
        await f.page.screenshot({
          path: `${output}/live-public-recipe.png`,
          fullPage: true,
        })
        await f.context.close()
      },
    )
  await check(
    'responsive 360 390 768 1440, light/dark, sheet focus trap and Escape restoration',
    async () => {
      for (const theme of ['light', 'dark']) {
        const f = await fixture({ known: true, theme, dayCount: 7 })
        await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
        for (const width of [360, 390, 768, 1101, 1440]) {
          await f.page.setViewportSize({ width, height: 960 })
          await visible(button(f.page, 'Đổi món / khẩu phần'))
          assert.equal(
            await f.page.locator('html').getAttribute('data-theme'),
            theme,
          )
          await noOverflow(f.page)
          if (width > 1300)
            assert.equal(
              await f.page.locator('.nm-app-links').evaluate((node) => {
                const nav = node.closest('nav').getBoundingClientRect()
                return [
                  ...node.querySelectorAll(':scope > a, .nm-guide-trigger'),
                ].every((link) => {
                  const rect = link.getBoundingClientRect()
                  return rect.left >= nav.left && rect.right <= nav.right
                })
              }),
              true,
              'Desktop navigation links must fit the shell',
            )
          else {
            await button(f.page, 'Mở menu').click()
            await visible(
              f.page
                .locator('.nm-app-links')
                .getByRole('link', { name: 'Dinh dưỡng', exact: true }),
            )
            await button(f.page, 'Đóng menu').click()
          }
          await f.page.screenshot({
            path: `${output}/plan-${width}-${theme}.png`,
            fullPage: true,
          })
          await openEditor(f.page)
          await noOverflow(f.page)
          const dialog = f.page.getByRole('dialog')
          assert.ok(
            await dialog.evaluate((node) =>
              node.contains(document.activeElement),
            ),
          )
          await dialog.locator('button').last().focus()
          await f.page.keyboard.press('Tab')
          assert.ok(
            await dialog.evaluate((node) =>
              node.contains(document.activeElement),
            ),
          )
          if (width < 768) {
            const bounds = await dialog.boundingBox()
            assert.ok(Math.abs(bounds.y + bounds.height - 960) < 3)
          }
          await f.page.screenshot({
            path: `${output}/sheet-${width}-${theme}.png`,
            fullPage: false,
          })
          await f.page.keyboard.press('Escape')
          await dialog.waitFor({ state: 'hidden' })
          assert.equal(
            await f.page
              .getByRole('button', { name: 'Đổi món / khẩu phần' })
              .first()
              .evaluate((node) => document.activeElement === node),
            true,
          )
          await f.page
            .getByRole('link', { name: 'Mua sắm', exact: true })
            .click()
          await visible(
            f.page.getByRole('heading', { name: 'Gạo tẻ', exact: true }),
          )
          await noOverflow(f.page)
          await f.page.screenshot({
            path: `${output}/shopping-${width}-${theme}.png`,
            fullPage: true,
          })
          await f.page
            .getByRole('link', { name: '← Quay lại thực đơn', exact: true })
            .click()
          await button(f.page, 'Hồ sơ ăn uống').click()
          await visible(f.page.getByRole('dialog', { name: 'Hồ sơ ăn uống' }))
          await noOverflow(f.page)
          await f.page.screenshot({
            path: `${output}/profile-${width}-${theme}.png`,
            fullPage: false,
          })
          await f.page.keyboard.press('Escape')
          await f.page
            .getByRole('link', { name: 'Khám phá', exact: true })
            .click()
          await visible(f.page.locator('.nutrition-recipe-card').first())
          await noOverflow(f.page)
          await f.page.screenshot({
            path: `${output}/explore-${width}-${theme}.png`,
            fullPage: true,
          })
          await f.page.locator('.nutrition-recipe-card h3 a').first().click()
          await visible(button(f.page, 'Bắt đầu chế độ nấu'))
          await noOverflow(f.page)
          await f.page.screenshot({
            path: `${output}/recipe-${width}-${theme}.png`,
            fullPage: true,
          })
          await button(f.page, 'Đã ăn món này').click()
          const composer = f.page.getByRole('dialog', {
            name: 'Xác nhận đã ăn',
            exact: true,
          })
          await visible(composer)
          await noOverflow(f.page)
          await composer.locator('button').last().focus()
          await f.page.keyboard.press('Tab')
          assert.ok(
            await composer.evaluate((node) =>
              node.contains(document.activeElement),
            ),
          )
          await f.page.screenshot({
            path: `${output}/confirm-eaten-${width}-${theme}.png`,
            fullPage: false,
          })
          await f.page.keyboard.press('Escape')
          await composer.waitFor({ state: 'hidden' })
          assert.ok(
            await button(f.page, 'Đã ăn món này').evaluate(
              (node) => document.activeElement === node,
            ),
          )
          await f.page
            .getByRole('link', { name: 'Nhật ký', exact: true })
            .click()
          await visible(
            f.page.getByRole('heading', {
              name: 'Tổng của các món đã ghi',
              exact: true,
            }),
          )
          await noOverflow(f.page)
          await f.page.screenshot({
            path: `${output}/diary-${width}-${theme}.png`,
            fullPage: true,
          })
          await f.page
            .getByRole('link', { name: 'Thực đơn', exact: true })
            .click()
        }
        await f.context.close()
      }
    },
  )
  assert.deepEqual(
    unexpected,
    [],
    'Every API request is covered by a contract fixture',
  )
  assert.deepEqual(pageErrors, [], 'No uncaught browser exceptions')
  assert.deepEqual(consoleErrors, [], 'No unexpected console errors')
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
