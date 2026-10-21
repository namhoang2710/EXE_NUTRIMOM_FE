import {
  assert, browser, server, output, passed, unexpected, pageErrors, consoleErrors,
  fixture, check, visible, button, chooseSelect, date, writeFile,
} from './helpers/nutrition-browser.mjs'

const measurements = []
async function lifestyle(f) {
  await f.page.locator('.nutrition-profile-menu > summary').click()
  await button(f.page, 'Sinh hoạt').click()
  await visible(f.page.getByRole('dialog', { name: 'Hồ sơ ăn uống' }))
}
const shoppingPath = '/meal-plans/plan-qa/shopping-list'
try {
  await check('post audit lifestyle without snacks saves without a hidden snack count', async () => {
    const f = await fixture({ known: true })
    await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
    await lifestyle(f)
    await button(f.page, 'Lưu thay đổi').click()
    await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
    const writes = f.state.writes.filter((write) => write.path === '/me/nutrition-profile')
    assert.equal(writes.length, 1)
    assert.deepEqual(writes[0].body.meal_types, ['LUNCH'])
    assert.equal(Object.hasOwn(writes[0].body, 'snack_count'), false)
    assert.equal(f.state.profile.snack_count, null)
    measurements.push({ name: 'no-snacks-profile', writes })
    await f.context.close()
  })
  await check('post audit selected snacks preserve the user confirmed count', async () => {
    const f = await fixture({ known: true, profile: { meal_types: ['LUNCH', 'SNACK'], snack_count: 2 } })
    await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
    await lifestyle(f)
    await chooseSelect(f.page, 'Số bữa phụ', '3')
    await button(f.page, 'Lưu thay đổi').click()
    await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
    const write = f.state.writes.find((item) => item.path === '/me/nutrition-profile')
    assert.equal(write.body.snack_count, 3)
    assert.deepEqual(write.body.meal_types, ['LUNCH', 'SNACK'])
    await f.context.close()
  })
  await check('post audit scoped shopping keeps its selected day using the returned list', async () => {
    const f = await fixture({ known: true, dayCount: 3 })
    const selected = '2026-10-19'
    await f.goto(`/app/nutrition/shopping/plan-qa?date=${date}&tab=plan&start_date=${selected}&end_date=${selected}`)
    const heading = f.page.locator('.nutrition-section-heading p')
    await visible(heading.filter({ hasText: '19/10/2026' }))
    await button(f.page, 'Đánh dấu đã mua').first().click()
    await visible(f.page.getByText('Đã cập nhật danh sách mua sắm.', { exact: true }))
    assert.equal(f.state.counts[`GET ${shoppingPath}`], 1, 'the returned list already has this date range')
    await visible(heading.filter({ hasText: '19/10/2026' }))
    assert.ok(f.state.shoppingQuery.includes(`start_date=${selected}`))
    assert.ok(f.state.shoppingQuery.includes(`end_date=${selected}`))
    measurements.push({ name: 'scoped-shopping', counts: f.state.counts, query: f.state.shoppingQuery })
    await f.context.close()
  })
  await check('post audit whole-plan shopping uses mutation results without a redundant GET', async () => {
    const f = await fixture({ known: true, dayCount: 3 })
    await f.goto(`/app/nutrition/shopping/plan-qa?date=${date}&tab=plan`)
    await button(f.page, 'Đánh dấu đã mua').first().click()
    await visible(f.page.getByText('Đã cập nhật danh sách mua sắm.', { exact: true }))
    assert.equal(f.state.counts[`GET ${shoppingPath}`], 1)
    measurements.push({ name: 'whole-plan-shopping', counts: f.state.counts })
    await f.context.close()
  })
  await check('post audit invalid inherited query names fall back to supported tabs and filters', async () => {
    const f = await fixture({ known: true })
    await f.goto(`/app/nutrition?tab=constructor&date=${date}`)
    await visible(f.page.getByRole('heading', { name: 'Những bữa ăn của bạn' }))
    await f.goto(`/app/nutrition?tab=explore&meal=constructor&role=toString&date=${date}`)
    await visible(f.page.getByRole('heading', { name: 'Khám phá món ăn' }))
    await visible(f.page.getByRole('heading', { name: 'Cơm trắng' }))
    assert.equal(new URLSearchParams(f.state.catalogQuery).has('mealType'), false)
    assert.equal(new URLSearchParams(f.state.catalogQuery).has('role'), false)
    await f.context.close()
  })
  assert.deepEqual(unexpected, [])
  assert.deepEqual(pageErrors, [])
  assert.deepEqual(consoleErrors, [])
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ passed, measurements, unexpected, pageErrors, consoleErrors, mode: process.env.NUTRITION_QA_MODE || 'development/StrictMode' }, null, 2))
  await browser.close()
  await server.close()
}
