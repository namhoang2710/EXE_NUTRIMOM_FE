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
  openEditor,
  date,
  writeFile,
} from './helpers/nutrition-browser.mjs'
import { nutritionGuide } from '../src/features/nutrition/model/nutrition-guide.ts'

const measurements = []
const key = 'nutrimom.nutrition.guide.v1:nutrition-account-a'
const trigger = (page) => button(page, 'Hướng dẫn sử dụng')
const dialog = (page) =>
  page.getByRole('dialog', { name: 'Hướng dẫn dinh dưỡng', exact: true })
const counter = (page) =>
  page.locator('.nutrition-guide-counter > span[aria-hidden]')
async function ready(f) {
  await f.goto(`/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
  await visible(button(f.page, 'Đổi món / khẩu phần'))
  await f.page.waitForLoadState('networkidle')
}
async function at(page, index) {
  await visible(
    page.getByRole('heading', {
      name: nutritionGuide[index].title,
      exact: true,
    }),
  )
  assert.equal(await counter(page).innerText(), `${index}/10`)
  await page.waitForFunction(
    () =>
      !document.querySelector(
        '.nutrition-guide .nm-dialog-footer > button:last-child',
      ).disabled,
  )
}
async function open(page, index = 0) {
  await trigger(page).click()
  await visible(dialog(page))
  await at(page, index)
}
async function to(page, from, target) {
  for (let i = from; i !== target;) {
    i += i < target ? 1 : -1
    await button(page, i > from ? 'Trang sau' : 'Trang trước').click()
    await at(page, i)
  }
}
async function close(page, control = 'Đóng hướng dẫn') {
  await button(page, control).click()
  await dialog(page).waitFor({ state: 'hidden' })
  await page.waitForFunction(() =>
    document.activeElement?.classList.contains('nutrition-guide-trigger'),
  )
  assert.notEqual(
    await page.evaluate(() => document.body.style.overflow),
    'hidden',
  )
}
const nutritionCounts = (state) =>
  Object.fromEntries(
    Object.entries(state.counts).filter(([name]) =>
      /\/(me\/nutrition-profile|meal-plans|diary|recipes|allergens|ingredients|recommendations)(\/|$)/.test(
        name,
      ),
    ),
  )

try {
  await check(
    'guide complete read-only journey 0 to 10 keeps requests unchanged and can restart',
    async () => {
      const f = await fixture({ known: true })
      await ready(f)
      assert.equal(await dialog(f.page).count(), 0, 'never auto-open')
      const before = nutritionCounts(f.state),
        writes = structuredClone(f.state.writes)
      await open(f.page)
      await visible(
        f.page.getByText(
          'Chào mừng bạn đến với tính năng cá nhân hóa từng bữa ăn.',
          { exact: true },
        ),
      )
      assert.equal(await button(f.page, 'Trang trước').isDisabled(), true)
      assert.equal(
        await f.page
          .locator(
            '.nutrition-guide-illustration button, .nutrition-guide-illustration input, .nutrition-guide-illustration a',
          )
          .count(),
        0,
      )
      assert.equal(
        await f.page.evaluate(() => document.body.style.overflow),
        'hidden',
      )
      for (let index = 1; index <= 10; index++) {
        await button(f.page, 'Trang sau').click()
        await at(f.page, index)
        await visible(f.page.getByRole('heading', { name: 'Bạn sẽ thấy gì?' }))
        assert.ok(
          (await f.page.locator('.nutrition-guide-steps > li').count()) >= 2,
        )
        assert.doesNotMatch(
          await dialog(f.page).innerText(),
          /\b(API|mutation|preview|conflict|enum|profile_version|429)\b/i,
        )
      }
      assert.equal(await button(f.page, 'Trang sau').count(), 0)
      await close(f.page, 'Đã hiểu')
      await open(f.page, 10)
      await button(f.page, 'Trang trước').click()
      await at(f.page, 9)
      await button(f.page, 'Xem lại từ đầu').click()
      await at(f.page, 0)
      await close(f.page)
      assert.deepEqual(nutritionCounts(f.state), before)
      assert.deepEqual(f.state.writes, writes)
      measurements.push({
        name: 'guide adds zero requests',
        before,
        after: nutritionCounts(f.state),
        writes: f.state.writes.length,
      })
      await f.context.close()
    },
  )
  await check(
    'guide resumes after close and reload and isolates each account',
    async () => {
      const f = await fixture({ known: true })
      await ready(f)
      await open(f.page)
      await to(f.page, 0, 4)
      await close(f.page)
      await open(f.page, 4)
      await close(f.page)
      await f.page.reload()
      await open(f.page, 4)
      assert.equal(
        await f.page.evaluate((k) => localStorage.getItem(k), key),
        '4',
      )
      await close(f.page)
      f.state.accountB = true
      await f.page.reload()
      // The restored user comes from /auth/me; it does not rewrite the stored token payload.
      await open(f.page, 0)
      await to(f.page, 0, 2)
      await close(f.page)
      const saved = await f.page.evaluate(
        (k) => [
          localStorage.getItem(k),
          localStorage.getItem(k.replace('account-a', 'account-b')),
        ],
        key,
      )
      assert.deepEqual(saved, ['4', '2'])
      await f.context.close()
    },
  )
  await check(
    'guide tolerates corrupted progress and blocked storage without losing this visit',
    async () => {
      for (const raw of ['not-json', '99', '-1']) {
        const f = await fixture({ known: true })
        await f.context.addInitScript(
          ({ key, raw }) => localStorage.setItem(key, raw),
          { key, raw },
        )
        await ready(f)
        await open(f.page)
        await close(f.page)
        await f.context.close()
      }
      const f = await fixture({ known: true })
      await f.context.addInitScript(() => {
        const get = Storage.prototype.getItem,
          set = Storage.prototype.setItem
        Storage.prototype.getItem = function (key) {
          if (key.startsWith('nutrimom.nutrition.guide.'))
            throw new Error('Blocked')
          return get.call(this, key)
        }
        Storage.prototype.setItem = function (key, value) {
          if (key.startsWith('nutrimom.nutrition.guide.'))
            throw new Error('Blocked')
          return set.call(this, key, value)
        }
      })
      await ready(f)
      await open(f.page)
      await to(f.page, 0, 3)
      await close(f.page)
      await open(f.page, 3)
      await close(f.page)
      await f.context.close()
    },
  )
  await check(
    'guide is available while profile loads and after profile failure',
    async () => {
      const f = await fixture({ known: true })
      let release
      const gate = new Promise((resolve) => {
        release = resolve
      })
      await f.context.route('**/api/v1/me/nutrition-profile', async (route) => {
        await gate
        await route.fulfill({
          status: 503,
          json: {
            error: { code: 'TEMPORARY', message: 'Chưa tải được hồ sơ.' },
          },
        })
      })
      await f.goto(`/app/nutrition?tab=plan&date=${date}`)
      await open(f.page)
      await to(f.page, 0, 2)
      release()
      await at(f.page, 2)
      await close(f.page)
      await visible(f.page.getByRole('alert'))
      await open(f.page, 2)
      await close(f.page)
      await f.context.close()
    },
  )
  await check(
    'guide keyboard trap Escape and backdrop close restore focus and scrolling',
    async () => {
      const f = await fixture({ known: true })
      await ready(f)
      await f.page.locator('.nutrition-profile-menu > summary').click()
      await open(f.page)
      assert.equal(
        await f.page.locator('.nutrition-profile-menu').getAttribute('open'),
        null,
      )
      await button(f.page, 'Đóng hướng dẫn').focus()
      await f.page.keyboard.press('Shift+Tab')
      assert.equal(
        await button(f.page, 'Trang sau').evaluate(
          (node) => node === document.activeElement,
        ),
        true,
      )
      await f.page.keyboard.press('Tab')
      assert.equal(
        await button(f.page, 'Đóng hướng dẫn').evaluate(
          (node) => node === document.activeElement,
        ),
        true,
      )
      await trigger(f.page).evaluate((node) => node.focus())
      await f.page.keyboard.press('Tab')
      assert.equal(
        await button(f.page, 'Đóng hướng dẫn').evaluate(
          (node) => node === document.activeElement,
        ),
        true,
      )
      await f.page.keyboard.press('Escape')
      await dialog(f.page).waitFor({ state: 'hidden' })
      await f.page.waitForFunction(() =>
        document.activeElement?.classList.contains('nutrition-guide-trigger'),
      )
      assert.equal(
        await trigger(f.page).evaluate(
          (node) => node === document.activeElement,
        ),
        true,
      )
      await open(f.page)
      await f.page.mouse.click(3, 3)
      await dialog(f.page).waitFor({ state: 'hidden' })
      await f.page.waitForFunction(() =>
        document.activeElement?.classList.contains('nutrition-guide-trigger'),
      )
      assert.equal(
        await trigger(f.page).evaluate(
          (node) => node === document.activeElement,
        ),
        true,
      )
      assert.notEqual(
        await f.page.evaluate(() => document.body.style.overflow),
        'hidden',
      )
      await f.context.close()
    },
  )
  await check(
    'guide motion animates open close and pages without duplicate navigation',
    async () => {
      const f = await fixture({ known: true, reducedMotion: 'no-preference' })
      await ready(f)
      const opening = await f.page.evaluate(async () => {
        const opener = document.querySelector('.nutrition-guide-trigger')
        opener.focus()
        opener.click()
        const samples = [],
          start = performance.now()
        await new Promise((resolve) => {
          const sample = () => {
            const panel = document.querySelector('.nutrition-guide')
            if (panel)
              samples.push({
                opacity: Number(getComputedStyle(panel).opacity),
                transform: getComputedStyle(panel).transform,
              })
            if (performance.now() - start < 420) requestAnimationFrame(sample)
            else resolve()
          }
          requestAnimationFrame(sample)
        })
        return samples
      })
      await at(f.page, 0)
      assert.ok(opening.some((sample) => sample.opacity < 0.95))
      assert.ok(opening.at(-1).opacity > 0.99)
      const pageMotion = await f.page.evaluate(async () => {
        const next = document.querySelector(
          '.nutrition-guide .nm-dialog-footer > button:last-child',
        )
        next.click()
        next.click()
        next.click()
        const samples = [],
          start = performance.now()
        await new Promise((resolve) => {
          const sample = () => {
            const article = document.querySelector('.nutrition-guide-page')
            if (article) samples.push(getComputedStyle(article).transform)
            if (performance.now() - start < 480) requestAnimationFrame(sample)
            else resolve()
          }
          requestAnimationFrame(sample)
        })
        return samples
      })
      await at(f.page, 1)
      assert.ok(
        pageMotion.some(
          (value) => value !== 'none' && value !== 'matrix(1, 0, 0, 1, 0, 0)',
        ),
      )
      await button(f.page, 'Đóng hướng dẫn').focus()
      await button(f.page, 'Đóng hướng dẫn').click()
      await f.page.waitForFunction(() =>
        document.querySelector(
          '.nm-dialog-backdrop[data-dialog-state="closing"]',
        ),
      )
      assert.equal(
        await f.page.evaluate(() => document.body.style.overflow),
        'hidden',
      )
      assert.equal(
        await f.page.evaluate(() =>
          Boolean(document.activeElement?.closest('.nutrition-guide')),
        ),
        true,
      )
      await dialog(f.page).waitFor({ state: 'hidden' })
      await f.page.waitForFunction(() =>
        document.activeElement?.classList.contains('nutrition-guide-trigger'),
      )
      assert.equal(
        await trigger(f.page).evaluate(
          (node) => node === document.activeElement,
        ),
        true,
      )
      assert.notEqual(
        await f.page.evaluate(() => document.body.style.overflow),
        'hidden',
      )
      measurements.push({ name: 'open/page motion', opening, pageMotion })
      await f.context.close()
    },
  )
  await check(
    'guide responsive light dark fixed footer and large-text reflow stay usable',
    async () => {
      for (const theme of ['light', 'dark']) {
        for (const width of [360, 390, 768, 1440]) {
          const f = await fixture({ known: true, theme })
          await f.page.setViewportSize({ width, height: 1000 })
          await ready(f)
          const guideBox = await trigger(f.page).boundingBox()
          const profileBox = await f.page
            .locator('.nutrition-profile-menu > summary')
            .boundingBox()
          assert.ok(guideBox.y + guideBox.height <= profileBox.y)
          assert.ok(Math.abs(guideBox.width - profileBox.width) <= 1)
          assert.ok(guideBox.height >= 44 && profileBox.height >= 44)
          assert.ok(
            (await trigger(f.page).evaluate((node) =>
              parseFloat(getComputedStyle(node).fontSize),
            )) >= 14,
          )
          await noOverflow(f.page)
          if (width === 360 || width === 1440)
            await f.page.screenshot({
              path: `${output}/banner-${width}-${theme}.png`,
              fullPage: false,
            })
          await open(f.page)
          const footerStart = await f.page
            .locator('.nutrition-guide .nm-dialog-footer')
            .boundingBox()
          for (const index of [0, 6, 10]) {
            if (index) await to(f.page, index === 6 ? 0 : 6, index)
            await noOverflow(f.page)
            const bounds = await dialog(f.page).boundingBox(),
              footer = await f.page
                .locator('.nutrition-guide .nm-dialog-footer')
                .boundingBox()
            assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1)
            assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 1001)
            assert.ok(Math.abs(footer.y - footerStart.y) < 2)
            const previous = await button(f.page, 'Trang trước').boundingBox(),
              count = await counter(f.page).boundingBox(),
              next = await f.page
                .locator(
                  '.nutrition-guide .nm-dialog-footer > button:last-child',
                )
                .boundingBox()
            assert.ok(
              previous.x + previous.width <= count.x &&
                count.x + count.width <= next.x,
            )
            assert.equal(
              await f.page
                .locator('.nutrition-guide-illustration')
                .evaluate((node) => node.scrollWidth <= node.clientWidth),
              true,
            )
            await f.page.screenshot({
              path: `${output}/guide-${index}-${width}-${theme}.png`,
              fullPage: false,
            })
          }
          await close(f.page)
          await f.context.close()
        }
      }
      const f = await fixture({ known: true })
      await ready(f)
      await open(f.page)
      await to(f.page, 0, 3)
      for (const width of [360, 720]) {
        await f.page.setViewportSize({ width, height: 500 })
        await f.page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        )
        await noOverflow(f.page)
        const footer = await f.page
          .locator('.nutrition-guide .nm-dialog-footer')
          .boundingBox()
        assert.ok(footer.y >= 0 && footer.y + footer.height <= 501)
        assert.equal(
          await f.page
            .locator('.nutrition-guide .nm-dialog-body')
            .evaluate((node) => node.scrollHeight > node.clientHeight),
          true,
        )
        await f.page.screenshot({
          path: `${output}/guide-short-${width}.png`,
          fullPage: false,
        })
      }
      await close(f.page)
      await f.context.close()
    },
  )
  await check(
    'guide text enlarged to 200 percent keeps navigation and instructions readable',
    async () => {
      const f = await fixture({ known: true })
      await f.page.setViewportSize({ width: 360, height: 800 })
      await ready(f)
      await open(f.page)
      await f.page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
      await noOverflow(f.page)
      for (const target of [0, 3]) {
        if (target) await to(f.page, 0, target)
        const body = f.page.locator('.nutrition-guide .nm-dialog-body')
        assert.ok((await body.evaluate((node) => node.clientHeight)) > 100)
        assert.equal(
          await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          true,
        )
        assert.equal(
          await dialog(f.page).evaluate(
            (node) => node.scrollWidth <= node.clientWidth,
          ),
          true,
        )
        const footer = await f.page
          .locator('.nutrition-guide .nm-dialog-footer')
          .boundingBox()
        assert.ok(footer.y + footer.height <= 801)
        await f.page.screenshot({
          path: `${output}/guide-text-200-${target}.png`,
          fullPage: false,
        })
      }
      await close(f.page)
      await f.context.close()
    },
  )
  await check(
    'guide respects reduced motion and existing profile edit and regenerate dialogs still work',
    async () => {
      const f = await fixture({ known: true, reducedMotion: 'reduce' })
      await ready(f)
      await open(f.page)
      assert.equal(
        await dialog(f.page)
          .locator('.nm-dialog-header p')
          .evaluate((node) => getComputedStyle(node).animationName),
        'none',
      )
      await to(f.page, 0, 2)
      assert.equal(
        await f.page
          .locator('.nutrition-guide-page')
          .evaluate((node) => getComputedStyle(node).transform),
        'none',
      )
      await close(f.page)
      await f.page.locator('.nutrition-profile-menu > summary').click()
      await button(f.page, 'Sinh hoạt').click()
      await visible(f.page.getByRole('dialog', { name: 'Hồ sơ ăn uống' }))
      await f.page
        .getByLabel('Ngân sách mỗi ngày', { exact: true })
        .fill('150000')
      await button(f.page, 'Lưu thay đổi').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      assert.equal(f.state.profile.daily_budget_vnd, 150000)
      await openEditor(f.page)
      await f.page.getByLabel('Số phần', { exact: true }).fill('1.5')
      await button(f.page, 'Cập nhật khẩu phần').click()
      await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
      await f.page.locator('.nutrition-plan-tools > summary').click()
      await button(f.page, 'Tạo lại món chưa giữ').click()
      await visible(f.page.getByRole('dialog', { name: 'Tạo lại thực đơn' }))
      await button(f.page, 'Hủy').click()
      assert.equal(
        f.state.counts['POST /meal-plans/plan-qa/regenerate'] || 0,
        0,
      )
      assert.notEqual(
        await f.page.evaluate(() => document.body.style.overflow),
        'hidden',
      )
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
        integration:
          'Guide is local-only. Business API responses use fixtures.',
      },
      null,
      2,
    ),
  )
  await browser.close()
  await server.close()
}
