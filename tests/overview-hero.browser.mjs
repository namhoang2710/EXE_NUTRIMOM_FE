import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { createServer, preview } from 'vite'
import { entitlementsFor, planDtos } from './fixtures/subscription-plans.ts'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const output = process.env.OVERVIEW_QA_OUTPUT || 'qa-artifacts/overview-v2'
await mkdir(output, { recursive: true })
let server
if (process.env.OVERVIEW_QA_PREVIEW === '1') {
  const app = await preview({ preview: { host: '127.0.0.1', port: 5196, strictPort: true, open: false } })
  server = {
    listen: async () => undefined,
    close: () => new Promise((resolve, reject) => {
      app.httpServer.close(error => error ? reject(error) : resolve())
      app.httpServer.closeAllConnections()
    }),
  }
} else {
server = await createServer({
  server: {
    host: '127.0.0.1',
    port: 5196,
    strictPort: true,
    open: false,
    watch: { ignored: ['**/qa-artifacts/**'] },
  },
})
}
await server.listen()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const passed = [],
  errors = [],
  unexpected = [],
  evidence = []
const posterPath = '/media/overview/welcome-landscape-v2.webp'
const videoPath = '/media/overview/welcome-landscape-v2.mp4'
const pregnancy = {
  id: 'pregnancy-fixture',
  gestational_week: 26,
  gestational_day: 4,
  trimester: 2,
  estimated_due_date: '2027-01-21',
  days_until_due: 94,
  local_date: '2026-10-19',
  timezone: 'Asia/Ho_Chi_Minh',
  auto_plan_paused: false,
}
async function fixture(options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: options.motion || 'reduce',
  })
  const user = {
    id: 'overview-qa',
    phone: '0900000000',
    display_name: options.name || 'Nguyễn Minh Anh',
    role: options.partner ? 'PARTNER' : 'MOM',
    roles: ['USER'],
    status: 'ACTIVE',
    onboarding_status: 'COMPLETED',
    created_at: '2026-01-01T00:00:00Z',
  }
  await context.addInitScript(
    ({ user, theme, saveData, anonymous, observeEntry }) => {
      localStorage.setItem('nutrimom.theme', theme)
      window.qaTransitionAnimations = []
      document.addEventListener('animationstart', (event) =>
        window.qaTransitionAnimations.push(event.animationName),
      )
      if (!anonymous)
        sessionStorage.setItem(
          'nutrimom.auth-session',
          JSON.stringify({
            accessToken: 'fixture',
            refreshToken: 'fixture',
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
      if (observeEntry) {
        window.qaEntrySamples = []
        setInterval(() => {
          const shell = document.querySelector('[data-overview-entry]')
          if (shell && document.querySelector('.nm-overview-hero__eyebrow'))
            window.qaEntrySamples.push({
              time: Date.now(),
              phase: shell.dataset.overviewEntry,
              heading:
                document.querySelector('#overview-greeting')?.textContent,
              skeleton: Boolean(
                document.querySelector('.nm-overview-hero__skeleton'),
              ),
              eyebrow: getComputedStyle(
                document.querySelector('.nm-overview-hero__eyebrow'),
              ).visibility,
            })
        }, 25)
      }
      if (saveData)
        Object.defineProperty(navigator, 'connection', {
          configurable: true,
          value: Object.assign(new EventTarget(), {
            saveData: true,
            effectiveType: '4g',
          }),
        })
    },
    {
      user,
      theme: options.theme || 'light',
      saveData: options.saveData,
      anonymous: options.anonymous,
      observeEntry: options.observeEntry,
    },
  )
  const state = {
    media: [],
    api: [],
    writes: [],
    failDashboard: false,
    dashboardAt: 0,
    cancelled: [],
  }
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace('/api/v1', '')
    state.api.push(`${request.method()} ${path}`)
    if (!['GET', 'OPTIONS'].includes(request.method())) state.writes.push(path)
    const ok = (data) =>
      route.fulfill({ json: { data, meta: { request_id: 'fixture' } } })
    if (path === '/auth/login')
      return ok({
        access_token: 'login-fixture',
        refresh_token: 'login-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_expires_in: 86400,
        user,
      })
    if (path === '/auth/logout') return ok(null)
    if (path === '/auth/me') return ok(user)
    if (path === '/users/me') {
      if (request.method() === 'PATCH')
        Object.assign(user, request.postDataJSON())
      return ok({ ...user, email: 'fixture@example.test', version: 1 })
    }
    if (path === '/users/me/preferences')
      return ok({
        timezone: 'Asia/Ho_Chi_Minh',
        theme: options.theme || 'light',
        version: 1,
      })
    if (path === '/subscription-plans') return ok(planDtos)
    if (path === '/subscriptions/me') {
      if (options.subscriptionDelay)
        await new Promise((resolve) =>
          setTimeout(resolve, options.subscriptionDelay),
        )
      if (options.subscriptionError)
        return route.fulfill({
          status: 503,
          json: {
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Tạm thời chưa tải được gói.',
            },
          },
        })
      const data = entitlementsFor(options.tier || 'PLAN_399K')
      if (options.expiry) data.end_date = options.expiry
      return ok(data)
    }
    if (
      [
        '/experts',
        '/allergens',
        '/family-groups',
        '/family-members',
        '/family-invitations/received',
      ].includes(path)
    )
      return ok([])
    if (path === '/notifications/unread-count') return ok({ count: 0 })
    if (path === '/notifications') return ok({ items: [], next_cursor: null })
    if (path === '/assistant/status') return ok({ ai_ready: false, provider: 'GUIDE', remaining_ai_messages: 0, daily_ai_limit: 0, retention_days: 30 })
    if (path === '/assistant/preferences') return ok({ cloud_consent: false, use_profile: true, use_pregnancy: true, use_medical_records: false, version: 1 })
    if (path === '/assistant/conversations') return ok([])
    if (path === '/assistant/context') return ok({ display_name: user.display_name, headline: 'Đồng hành cùng mẹ', items: [], suggestions: [], context_version: 1, updated_at: '2026-10-19T00:00:00Z' })
    if (path === '/dashboard/mom') {
      state.dashboardAt = Date.now()
      if (options.dashboardDelay)
        await new Promise((resolve) =>
          setTimeout(resolve, options.dashboardDelay),
        )
      if (state.failDashboard)
        return route.fulfill({
          status: 429,
          json: {
            error: {
              code: 'RATE_LIMITED',
              message: 'Vui lòng thử lại sau.',
              retryable: false,
            },
          },
        })
      return ok({
        profile_summary: { ...user, salutation: 'Chị' },
        pregnancy_summary: options.noPregnancy ? null : pregnancy,
        next_appointment: null,
        unread_notification_count: 0,
        upcoming_reminders: [],
      })
    }
    if (path === '/dashboard/partner')
      return ok({
        pregnancy_overview: pregnancy,
        assigned_tasks: [],
        shared_calendar: [],
        activity_feed: [],
      })
    if (path === '/calendar/month') {
      if (options.calendarDelay) await new Promise(resolve => setTimeout(resolve, options.calendarDelay))
      if (options.limitCalendar && state.api.filter(path => path === 'GET /calendar/month').length === 1)
        return route.fulfill({ status: 429, headers: { 'Retry-After': '2' }, json: { error: { code: 'RATE_LIMITED', message: 'Vui lòng chờ rồi thử lại.' } } })
      return ok([])
    }
    if (path === '/calendar/events') return ok([])
    if (path === '/family/shared-calendar/month')
      return ok({
        days: [],
        allowed_sources: ['REMINDER', 'CONSULTATION'],
        family_group_id: 'family-fixture',
        owner_display_name: 'Mẹ',
      })
    if (path === '/family/shared-calendar/events')
      return ok({
        events: [],
        allowed_sources: ['REMINDER', 'CONSULTATION'],
        family_group_id: 'family-fixture',
        owner_display_name: 'Mẹ',
      })
    if (path === '/me/nutrition-profile')
      return ok({
        profile_id: pregnancy.id,
        profile_version: 1,
        pregnancy: { ...pregnancy, pregnancy_id: pregnancy.id },
        allergy_status: 'KNOWN_NONE',
        allergen_ids: [],
        hard_exclusion_ingredient_ids: [],
        disliked_ingredient_ids: [],
        tolerance_tags: [],
        favorite_recipe_ids: [],
        blocked_recipe_ids: [],
        meal_types: ['LUNCH'],
        snack_count: 1,
        needs_allergy_confirmation: false,
        energy_estimate: { kcal_per_day: null, unmet: [] },
      })
    if (path === '/diary')
      return ok({
        local_date: '2026-10-19',
        entries: [],
        logged_nutrition: {},
        planned_nutrition: {},
        planned_coverage: 'PARTIAL',
        logged_coverage: 'PARTIAL',
        remaining: { by_nutrient: {}, notes: [] },
        notes: [],
        method_notes: [],
      })
    if (path === '/recommendations')
      return ok({ profile_version: 1, meals: [], notes: [] })
    unexpected.push(path)
    return route.fulfill({
      status: 500,
      json: { error: { code: 'UNMOCKED', message: path } },
    })
  })
  if (options.brokenVideo)
    await context.route(`**${videoPath}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'video/mp4',
        body: 'not a video',
      }),
    )
  const page = await context.newPage()
  page.on('pageerror', (reason) => errors.push(String(reason)))
  page.on('crash', () => errors.push('Browser renderer crashed'))
  page.on('requestfailed', request => {
    if (new URL(request.url()).pathname.startsWith('/api/v1/')) state.cancelled.push(request.failure()?.errorText)
  })
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === videoPath)
      state.media.push(request.url())
  })
  return {
    page,
    context,
    state,
    user,
    goto: (path) => page.goto(`http://127.0.0.1:5196${path}`),
  }
}
async function check(name, run) {
  if (
    process.env.OVERVIEW_QA_FILTER &&
    !process.env.OVERVIEW_QA_FILTER.split('|').some((filter) =>
      name.includes(filter),
    )
  )
    return
  try {
    await run()
    passed.push(name)
    console.log(`PASS ${name}`)
  } catch (error) {
    for (const context of browser.contexts())
      for (const page of context.pages()) {
        await page.screenshot({
          path: `${output}/failure.png`,
          fullPage: true,
          animations: 'disabled',
        })
        await writeFile(`${output}/failure.html`, await page.content())
        console.log(
          page.url(),
          (await page.locator('body').innerText()).slice(-4000),
        )
      }
    throw error
  }
}
async function ready(page) {
  await page.getByRole('heading', { name: 'Chào mẹ Nguyễn Minh Anh' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
}
async function submitLogin(page) {
  const identifier = page.getByLabel('Email hoặc Số điện thoại')
  const password = page.getByLabel('Mật khẩu', { exact: true })
  await identifier.pressSequentially('fixture@example.test', { delay: 10 })
  await password.pressSequentially('Fixture123!', { delay: 10 })
  assert.equal(await identifier.inputValue(), 'fixture@example.test')
  assert.equal(await password.inputValue(), 'Fixture123!')
  await page.evaluate(() => {
    window.qaTransitionAnimations = []
  })
  await page.locator('form button[type="submit"]').click()
}
async function fits(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    'No horizontal overflow',
  )
}
try {
  await check(
    'responsive poster typography and glass header overlap',
    async () => {
      for (const theme of ['light', 'dark']) {
        const f = await fixture({ theme })
        for (const width of [360, 390, 768, 1024, 1440]) {
          await f.page.setViewportSize({ width, height: 1000 })
          await f.goto('/app')
          await ready(f.page)
          await fits(f.page)
          const bounds = await f.page.evaluate(() => {
            const hero = document
                .querySelector('.nm-overview-hero')
                .getBoundingClientRect(),
              header = document
                .querySelector('.nm-app-header')
                .getBoundingClientRect()
            return {
              heroTop: hero.top,
              headerTop: header.top,
              headerBottom: header.bottom,
              heroBottom: hero.bottom,
              theme: document.documentElement.dataset.theme,
              videos: document.querySelectorAll('video').length,
            }
          })
          assert.equal(bounds.heroTop, 0)
          assert.ok(
            bounds.headerTop > 0 && bounds.headerBottom < bounds.heroBottom,
          )
          assert.equal(bounds.theme, theme)
          assert.equal(bounds.videos, 1)
          await f.page.screenshot({
            path: `${output}/overview-${width}-${theme}.png`,
            animations: 'disabled',
          })
        }
        await f.context.close()
      }
    },
  )
  await check(
    'real playback fade loop does not reload the source or call APIs',
    async () => {
      const f = await fixture({ motion: 'no-preference' })
      await f.goto('/app')
      await ready(f.page)
      await f.page.waitForFunction(() => {
        const v = document.querySelector('video')
        return v && !v.paused && v.readyState >= 2 && v.currentTime > 0.6
      })
      const mediaBefore = f.state.media.length,
        apiBefore = [...f.state.api]
      await f.page.evaluate(() => {
        window.qaHero = document.querySelector('video')
        window.qaHero.currentTime = window.qaHero.duration - 0.3
      })
      await f.page.waitForFunction(
        () => Number(document.querySelector('video').style.opacity) < 0.9,
      )
      await f.page.waitForFunction(() => {
        const v = document.querySelector('video')
        return (
          v.currentTime > 0.55 &&
          v.currentTime < 3 &&
          !v.paused &&
          Number(v.style.opacity) === 1
        )
      })
      assert.equal(f.state.media.length, mediaBefore)
      assert.deepEqual(f.state.api, apiBefore)
      evidence.push({
        mediaRequestsForLoop: mediaBefore,
        extraRequestsOnLoop: f.state.media.length - mediaBefore,
        video: await f.page.locator('video').evaluate((v) => ({
          width: v.videoWidth,
          height: v.videoHeight,
          duration: v.duration,
          loop: v.loop,
          muted: v.muted,
        })),
      })
      await f.page.screenshot({
        path: `${output}/overview-video-desktop.png`,
        animations: 'disabled',
      })
      await f.context.close()
    },
  )
  await check(
    'offscreen stops playback and return resumes without another source request',
    async () => {
      const f = await fixture({ motion: 'no-preference' })
      await f.goto('/app')
      await ready(f.page)
      await f.page.waitForFunction(
        () => !document.querySelector('video').paused,
      )
      assert.equal(
        await f.page.getByRole('button', { name: /nền động/ }).count(),
        0,
      )
      const before = f.state.media.length
      await f.page.evaluate(() =>
        scrollTo(
          0,
          document.querySelector('.nm-overview-hero').getBoundingClientRect()
            .height + 200,
        ),
      )
      await f.page.waitForFunction(() => document.querySelector('video').paused)
      const pausedTime = await f.page
        .locator('video')
        .evaluate((v) => v.currentTime)
      await f.page.waitForTimeout(250)
      assert.equal(
        await f.page.locator('video').evaluate((v) => v.currentTime),
        pausedTime,
      )
      await f.page.evaluate(() => scrollTo(0, 0))
      await f.page.waitForFunction(
        () => !document.querySelector('video').paused,
      )
      assert.equal(f.state.media.length, before)
      await f.context.close()
    },
  )
  await check(
    'visibility events suspend and resume the same decoder',
    async () => {
      const f = await fixture({ motion: 'no-preference' })
      await f.goto('/app')
      await ready(f.page)
      await f.page.waitForFunction(
        () => !document.querySelector('video').paused,
      )
      const before = f.state.media.length
      await f.page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'hidden',
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await f.page.waitForFunction(() => document.querySelector('video').paused)
      await f.page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'visible',
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await f.page.waitForFunction(
        () => !document.querySelector('video').paused,
      )
      assert.equal(f.state.media.length, before)
      await f.context.close()
    },
  )
  await check(
    'background autoplays without controls under both preferences',
    async () => {
      for (const options of [
        { motion: 'reduce' },
        { motion: 'no-preference', saveData: true },
      ]) {
        const f = await fixture(options)
        await f.goto('/app')
        await ready(f.page)
        await f.page.waitForFunction(
          () =>
            !document.querySelector('video').paused &&
            document.querySelector('video').readyState >= 2,
        )
        assert.ok(f.state.media.length > 0)
        await f.context.close()
      }
    },
  )
  await check(
    'navigation frees decoder and nutrition banner remains underneath header',
    async () => {
      const f = await fixture({ motion: 'no-preference' })
      await f.goto('/app')
      await ready(f.page)
      await f.page.waitForFunction(
        () => !document.querySelector('video').paused,
      )
      await f.page.evaluate(() => {
        window.qaOldVideo = document.querySelector('video')
      })
      await f.page.getByRole('link', { name: 'Khám phá dinh dưỡng' }).click()
      await f.page
        .getByRole('heading', { name: 'Dinh dưỡng là điều quan trọng nhất của một người mẹ bầu', exact: true })
        .waitFor()
      await f.page.waitForFunction(
        () =>
          !window.qaOldVideo.getAttribute('src') &&
          window.qaOldVideo.paused &&
          window.qaOldVideo.readyState === 0,
      )
      assert.equal(await f.page.locator('video').count(), 0)
      assert.equal(await f.page.locator('.has-overview-hero').count(), 0)
      assert.equal(
        await f.page
          .locator('.nm-app-header')
          .evaluate((node) => getComputedStyle(node).position),
        'fixed',
      )
      await f.context.close()
    },
  )
  await check(
    'failed media settles on the poster and actions still work',
    async () => {
      const f = await fixture({ motion: 'no-preference', brokenVideo: true })
      await f.goto('/app')
      await ready(f.page)
      await f.page.waitForFunction(
        () => document.querySelector('video').getAttribute('src') === null,
      )
      await f.page
        .getByRole('button', { name: /nền động/ })
        .waitFor({ state: 'hidden' })
      assert.equal(
        await f.page
          .locator('.nm-overview-hero__poster')
          .evaluate((img) => img.complete && img.naturalWidth > 0),
        true,
      )
      await f.page.getByRole('link', { name: 'Xem lịch chăm sóc' }).click()
      await f.page.waitForURL('**/app#calendar')
      assert.equal(f.state.media.length, 1)
      await f.context.close()
    },
  )
  await check(
    'greetings retain pregnancy and partner semantics with long names',
    async () => {
      const f = await fixture({ noPregnancy: true })
      await f.goto('/app')
      await f.page
        .getByRole('heading', { name: 'Chào chị, Nguyễn Minh Anh' })
        .waitFor()
      assert.equal(
        (await f.page.locator('.nm-overview-hero').innerText()).includes(
          'tuần',
        ),
        false,
      )
      await f.context.close()
      const partner = await fixture({ partner: true })
      await partner.goto('/app')
      await partner.page
        .getByRole('heading', { name: 'Chào Nguyễn Minh Anh' })
        .waitFor()
      await partner.page
        .getByText(
          'Những thông tin được chia sẻ trong hành trình thai kỳ của gia đình.',
        )
        .waitFor()
      await partner.context.close()
      const long = await fixture({
        name: 'Nguyễn Thị Minh Hương Trần Bảo Ngọc',
      })
      await long.page.setViewportSize({ width: 360, height: 740 })
      await long.goto('/app')
      await long.page
        .getByRole('heading', {
          name: 'Chào mẹ Nguyễn Thị Minh Hương Trần Bảo Ngọc',
        })
        .waitFor()
      await fits(long.page)
      const bounds = await long.page
        .getByRole('link', { name: 'Xem lịch chăm sóc' })
        .boundingBox()
      const footer = await long.page
        .locator('.nm-overview-hero__footer')
        .boundingBox()
      assert.ok(bounds.y + bounds.height < footer.y)
      await long.context.close()
    },
  )
  await check(
    'slow reload uses skeleton, complete greeting replaces it without a generic flash',
    async () => {
      const f = await fixture({ dashboardDelay: 1600, observeEntry: true })
      await f.goto('/app')
      await f.page
        .getByRole('status', { name: 'Đang tải thông tin tổng quan' })
        .waitFor()
      assert.equal(await f.page.locator('#overview-greeting').count(), 0)
      assert.equal(await f.page.locator('.nm-overview-curtains').count(), 0)
      await ready(f.page)
      const frames = await f.page.evaluate(() => window.qaEntrySamples)
      assert.ok(
        frames.every(
          (frame) =>
            !frame.heading ||
            frame.heading.trim() === 'Chào mẹ Nguyễn Minh Anh',
        ),
      )
      assert.ok(frames.every((frame) => frame.phase === 'stable'))
      assert.equal(
        f.state.api.filter((path) => path === 'GET /dashboard/mom').length,
        1,
      )
      await f.context.close()
    },
  )
  await check(
    'actual login stages welcome once, prefetches in parallel and persists across reload and route return',
    async () => {
      const f = await fixture({
        anonymous: true,
        observeEntry: true,
        motion: 'no-preference',
        dashboardDelay: 200,
      })
      await f.goto('/login')
      await submitLogin(f.page)
      await f.page.locator('[data-overview-entry="scene"]').waitFor()
      await f.page.screenshot({ path: `${output}/login-scene.png` })
      assert.equal(await f.page.locator('#overview-greeting').count(), 0)
      await f.page.locator('[data-overview-entry="eyebrow"]').waitFor()
      assert.equal(await f.page.locator('#overview-greeting').count(), 0)
      await ready(f.page)
      await f.page.waitForTimeout(850)
      const frames = await f.page.evaluate(() => window.qaEntrySamples)
      const phases = frames.map((frame) => frame.phase)
      for (const phase of ['scene', 'eyebrow', 'ready'])
        assert.ok(phases.includes(phase), phase)
      assert.ok(
        !phases.includes('opening'),
        'login panels must not open a second pair of curtains',
      )
      const loginAnimations = await f.page.evaluate(
        () => window.qaTransitionAnimations,
      )
      assert.equal(
        loginAnimations.filter((name) => name === 'auth-panel-close-left')
          .length,
        1,
      )
      assert.equal(
        loginAnimations.filter((name) => name === 'auth-panel-close-right')
          .length,
        1,
      )
      assert.equal(
        loginAnimations.filter((name) => name.startsWith('nm-curtain-')).length,
        0,
      )
      assert.ok(
        frames.every(
          (frame) =>
            !frame.heading ||
            (frame.phase === 'ready' &&
              frame.heading.trim() === 'Chào mẹ Nguyễn Minh Anh'),
        ),
      )
      assert.ok(
        f.state.dashboardAt <
          frames.find((frame) => frame.phase === 'scene').time,
        'fetch begins before banner reveal',
      )
      await f.page.screenshot({ path: `${output}/login-complete.png` })
      await f.page.reload()
      await ready(f.page)
      assert.equal(
        await f.page.locator('[data-overview-entry="stable"]').count(),
        1,
      )
      assert.equal(await f.page.locator('.auth-workspace-entry').count(), 0)
      assert.equal(
        f.state.api.filter((path) => path === 'GET /dashboard/mom').length,
        1,
      )
      await f.page.getByRole('link', { name: 'Khám phá dinh dưỡng' }).click()
      await f.page
        .getByRole('heading', { name: 'Dinh dưỡng là điều quan trọng nhất của một người mẹ bầu', exact: true })
        .waitFor()
      await f.page.locator('.nm-app-brand').click()
      await ready(f.page)
      assert.equal(
        await f.page.locator('[data-overview-entry="stable"]').count(),
        1,
      )
      assert.equal(
        f.state.api.filter((path) => path === 'GET /dashboard/mom').length,
        1,
      )
      evidence.push({
        loginPhases: [...new Set(phases)],
        dashboardRequestsAcrossLoginReloadAndReturn: 1,
      })
      await f.context.close()
    },
  )
  await check(
    'slow login waits for real data after eyebrow and skeleton',
    async () => {
      const f = await fixture({
        anonymous: true,
        observeEntry: true,
        motion: 'no-preference',
        dashboardDelay: 3400,
      })
      await f.goto('/login')
      await submitLogin(f.page)
      await f.page
        .getByRole('status', { name: 'Đang tải thông tin tổng quan' })
        .waitFor()
      assert.equal(await f.page.locator('#overview-greeting').count(), 0)
      await f.page.screenshot({ path: `${output}/greeting-skeleton.png` })
      await ready(f.page)
      const frames = await f.page.evaluate(() => window.qaEntrySamples)
      assert.ok(
        frames.some((frame) => frame.phase === 'ready' && frame.skeleton),
      )
      assert.ok(
        frames.every(
          (frame) =>
            !frame.heading ||
            frame.heading.trim() === 'Chào mẹ Nguyễn Minh Anh',
        ),
      )
      assert.equal(
        f.state.api.filter((path) => path === 'GET /dashboard/mom').length,
        1,
      )
      await f.context.close()
    },
  )
  await check(
    'header menu order, hover and keyboard dropdown; back-to-top is above chatbot and works',
    async () => {
      const f = await fixture()
      await f.goto('/app')
      await ready(f.page)
      const labels = await f.page
        .locator('.nm-app-links > a, .nm-app-links > .nm-guide-menu > button')
        .allTextContents()
      assert.deepEqual(
        labels.map((text) => text.trim()),
        [
          'Tổng quan',
          'Kiến thức',
          'Cộng đồng',
          'Cá nhân',
          'Hướng dẫn khách hàng',
        ],
      )
      await f.page.getByRole('button', { name: 'Cá nhân', exact: true }).hover()
      assert.deepEqual(
        await f.page
          .locator('#nm-personal-dropdown a')
          .allTextContents()
          .then((items) => items.map((item) => item.trim())),
        ['Bảng giá', 'Gia đình', 'Dinh dưỡng'],
      )
      await f.page
        .locator('#nm-personal-dropdown a')
        .first()
        .waitFor({ state: 'visible' })
      await f.page.screenshot({ path: `${output}/header-personal-menu.png` })
      await f.page.getByRole('button', { name: 'Cá nhân', exact: true }).focus()
      await f.page.keyboard.press('Escape')
      assert.equal(
        await f.page
          .getByRole('button', { name: 'Cá nhân', exact: true })
          .getAttribute('aria-expanded'),
        'false',
      )
      for (const width of [1440, 390, 630]) {
        await f.page.setViewportSize({ width, height: 900 })
        await f.page.evaluate(() => scrollTo(0, 1100))
        const button = f.page.getByRole('button', {
          name: 'Cuộn lên đầu trang',
        })
        await button.waitFor()
        await f.page.waitForTimeout(500)
        const top = await button.boundingBox(),
          bot = await f.page.locator('.nm-assistant-launcher').boundingBox()
        assert.ok(top.y + top.height < bot.y, 'back-to-top sits above bot')
        assert.ok(
          Math.abs(top.x + top.width / 2 - bot.x - bot.width / 2) < 2,
          'vertically aligned',
        )
        await f.page.screenshot({ path: `${output}/back-to-top-${width}.png` })
        await button.click()
        await f.page.waitForFunction(() => scrollY === 0)
        await fits(f.page)
      }
      await f.page.getByRole('button', { name: 'Mở menu', exact: true }).click()
      await f.page.getByRole('button', { name: 'Cá nhân', exact: true }).click()
      await f.page
        .locator('#nm-personal-dropdown a[href="/app/nutrition"]')
        .click()
      await f.page
        .getByRole('heading', { name: 'Dinh dưỡng là điều quan trọng nhất của một người mẹ bầu', exact: true })
        .waitFor()
      await fits(f.page)
      await f.context.close()
    },
  )
  await check(
    'profile edits invalidate persisted greeting and load the updated name',
    async () => {
      const f = await fixture()
      await f.goto('/app')
      await ready(f.page)
      await f.page.evaluate(async () => {
        const { userApi } = await import('/src/features/user/api/user-api.ts')
        await userApi.updateProfile({ display_name: 'Lê Bảo Ngọc', version: 1 })
      })
      await f.page.reload()
      await f.page
        .getByRole('heading', { name: 'Chào mẹ Lê Bảo Ngọc' })
        .waitFor()
      assert.equal(
        f.state.api.filter((path) => path === 'GET /dashboard/mom').length,
        2,
      )
      assert.equal(await f.page.locator('.nm-overview-curtains').count(), 0)
      await f.context.close()
    },
  )
  await check(
    '429 does not auto-retry or make extra requests on repeated retry clicks',
    async () => {
      const f = await fixture()
      f.state.failDashboard = true
      await f.goto('/app')
      await f.page
        .getByText('Chưa tải được thông tin chào mừng.', { exact: true })
        .waitFor()
      for (let i = 0; i < 3; i++) {
        await f.page.locator('.nm-overview-hero__error button').click()
        await f.page
          .getByText('Chưa tải được thông tin chào mừng.', { exact: true })
          .waitFor()
      }
      assert.equal(
        f.state.api.filter((path) => path === 'GET /dashboard/mom').length,
        1,
      )
      assert.equal(await f.page.locator('#overview-greeting').count(), 0)
      await f.page.reload()
      await f.page
        .getByText('Chưa tải được thông tin chào mừng.', { exact: true })
        .waitFor()
      assert.equal(
        f.state.api.filter((path) => path === 'GET /dashboard/mom').length,
        1,
        'reload respects stored cooldown',
      )
      await f.context.close()
    },
  )
  await check(
    'logout clears persisted dashboard and another account receives its own welcome',
    async () => {
      const f = await fixture({ anonymous: true, motion: 'no-preference' })
      async function login() {
        await submitLogin(f.page)
      }
      await f.goto('/login')
      await login()
      await ready(f.page)
      await f.page.locator('.nm-avatar-button').click()
      await f.page.evaluate(() => {
        window.qaTransitionAnimations = []
      })
      const exitPaths = []
      f.page.on('framenavigated', (frame) => {
        if (frame === f.page.mainFrame())
          exitPaths.push(new URL(frame.url()).pathname)
      })
      await f.page
        .getByRole('button', { name: 'Đăng xuất', exact: true })
        .click()
      await f.page.waitForURL('**/login')
      await f.page.locator('.auth-page--login').waitFor()
      await f.page.waitForTimeout(850)
      assert.ok(!exitPaths.includes('/'), 'logout must go straight to login')
      assert.equal(
        f.state.api.filter((path) => path === 'POST /auth/logout').length,
        1,
      )
      const logoutAnimations = await f.page.evaluate(
        () => window.qaTransitionAnimations,
      )
      assert.equal(
        logoutAnimations.filter((name) => name === 'auth-panel-open-left')
          .length,
        1,
      )
      assert.equal(
        logoutAnimations.filter((name) => name === 'auth-panel-open-right')
          .length,
        1,
      )
      await f.page.screenshot({ path: `${output}/logout-login.png` })
      assert.equal(
        await f.page.evaluate(
          () =>
            Object.keys(sessionStorage).filter((key) =>
              key.startsWith('nutrimom.dashboard.'),
            ).length,
        ),
        0,
      )
      Object.assign(f.user, {
        id: 'other-account',
        display_name: 'Trần Gia Minh',
        role: 'PARTNER',
      })
      await login()
      await f.page.locator('[data-overview-entry="scene"]').waitFor()
      await f.page
        .getByRole('heading', { name: 'Chào Trần Gia Minh' })
        .waitFor()
      assert.equal(
        await f.page
          .getByRole('heading', { name: 'Chào mẹ Nguyễn Minh Anh' })
          .count(),
        0,
      )
      assert.equal(
        f.state.api.filter((path) => path === 'GET /dashboard/mom').length,
        1,
      )
      assert.equal(
        f.state.api.filter((path) => path === 'GET /dashboard/partner').length,
        1,
      )
      await f.context.close()
    },
  )
  await check(
    'banner routes extend underneath header on direct desktop mobile and dark visits',
    async () => {
      for (const theme of ['light', 'dark']) {
        const f = await fixture({ theme })
        for (const width of [1440, 390, 768, 360]) {
          await f.page.setViewportSize({ width, height: 900 })
          for (const [path, selector, content] of [
            ['/app/family', '.family-hero', '.family-hero img'],
            ['/app/experts', '.consultation-banner', '.consultation-banner h1'],
            ['/app/contact', '.contactHero', '.contactHero__copy h1'],
            ['/app/nutrition', '.nutrition-banner', '.nutrition-banner__glass'],
          ]) {
            if (process.env.OVERVIEW_QA_BANNER_ROUTE && path !== process.env.OVERVIEW_QA_BANNER_ROUTE) continue
            await f.goto(path)
            await f.page.locator(selector).waitFor()
            await f.page.evaluate(() => document.fonts.ready)
            await fits(f.page)
            const geometry = await f.page.evaluate(
              ({ selector, content }) => {
                const banner = document
                  .querySelector(selector)
                  .getBoundingClientRect()
                const header = document
                  .querySelector('.nm-app-header')
                  .getBoundingClientRect()
                const text = document
                  .querySelector(content)
                  .getBoundingClientRect()
                return {
                  bannerTop: banner.top,
                  bannerBottom: banner.bottom,
                  headerBottom: header.bottom,
                  contentTop: text.top,
                  contentBottom: text.bottom,
                  contentWidth: text.width,
                  bannerWidth: banner.width,
                  position: getComputedStyle(
                    document.querySelector('.nm-app-header'),
                  ).position,
                }
              },
              { selector, content },
            )
            assert.equal(geometry.bannerTop, 0, path)
            assert.equal(geometry.position, 'fixed', path)
            assert.ok(geometry.bannerBottom > geometry.headerBottom)
            if (path === '/app/family') {
              assert.equal(geometry.contentTop, geometry.bannerTop)
              assert.equal(geometry.contentBottom, geometry.bannerBottom)
              assert.equal(geometry.contentWidth, geometry.bannerWidth)
              assert.equal(await f.page.locator('.family-hero-image').getAttribute('src'), '/bannerHub.png')
              assert.equal(await f.page.locator('.family-hero').evaluate(node => getComputedStyle(node).backgroundImage), 'none')
            } else {
              assert.ok(
                geometry.contentTop >= geometry.headerBottom,
                `${path}: content hidden under header`,
              )
            }
            await f.page.screenshot({
              path: `${output}/banner-${path.split('/').at(-1)}-${width}-${theme}.png`,
              animations: 'disabled',
            })
          }
        }
        await f.context.close()
      }
    },
  )
  await check(
    'nutrition image slogan glass metadata and menu remain usable',
    async () => {
      const f = await fixture()
      await f.goto('/app/nutrition')
      await f.page
        .getByRole('heading', { name: 'Dinh dưỡng là điều quan trọng nhất của một người mẹ bầu', exact: true })
        .waitFor()
      await f.page
        .locator('.nutrition-banner__glass')
        .getByText(/Tuần 26 ngày 4/)
        .waitFor()
      assert.match(
        await f.page.locator('.nutrition-banner__glass p').innerText(),
        /Hôm nay.*19\/10\/2026/,
      )
      assert.equal(
        await f.page
          .locator('.nutrition-banner__glass img')
          .count(),
        0,
      )
      assert.equal(
        await f.page
          .locator('.nutrition-banner__image')
          .evaluate((img) => img.complete && img.naturalWidth === 1916),
        true,
      )
      assert.match(
        await f.page
          .locator('.nutrition-banner__glass')
          .evaluate((el) => getComputedStyle(el).backdropFilter),
        /blur/,
      )
      await f.page.locator('.nutrition-profile-menu summary').click()
      await f.page.getByRole('button', { name: 'Dị ứng', exact: true }).click()
      await f.page.getByRole('dialog').waitFor()
      await f.context.close()
    },
  )
  await check(
    'subscription band is flush with hero and reveals correct plan actions and animated dates',
    async () => {
      for (const [tier, label] of [
        ['FREE', 'Tham khảo các gói'],
        ['PLAN_99K', 'Nâng cấp gói'],
        ['PLAN_399K', 'Gia hạn thêm gói'],
      ]) {
        const f = await fixture({
          tier,
          expiry: '2027-04-11T00:00:00Z',
          motion: 'no-preference',
        })
        await f.goto('/app')
        await ready(f.page)
        const band = f.page.locator('#overview-subscription')
        await band
          .getByRole('link', { name: label })
          .waitFor({ state: 'attached' })
        const geometry = await f.page.evaluate(() => {
          const hero = document
            .querySelector('.nm-overview-hero')
            .getBoundingClientRect()
          const band = document
            .querySelector('#overview-subscription')
            .getBoundingClientRect()
          return {
            gap: band.top - hero.bottom,
            width: band.width,
            background: getComputedStyle(
              document.querySelector('#overview-subscription'),
            ).backgroundColor,
          }
        })
        assert.equal(geometry.gap, 0)
        assert.equal(geometry.width, 1440)
        assert.equal(geometry.background, 'rgb(23, 19, 29)')
        assert.equal(
          await band.getByRole('button').count(),
          0,
          'no refresh button',
        )
        assert.equal(await band.getAttribute('data-revealed'), 'false')
        await f.page
          .getByRole('link', { name: 'Xem lịch chăm sóc', exact: true })
          .click()
        await f.page.waitForURL('**/app#calendar')
        await f.page.waitForFunction(
          () =>
            document.querySelector('#overview-subscription').dataset
              .revealed === 'true',
        )
        const years =
          tier === 'FREE'
            ? []
            : await f.page.evaluate(async () => {
                const values = []
                for (let i = 0; i < 30; i++) {
                  values.push(
                    document.querySelector(
                      'time .admin-animated-number:last-child > span[aria-hidden="true"]',
                    ).textContent,
                  )
                  await new Promise((resolve) => setTimeout(resolve, 30))
                }
                return values
              })
        if (tier === 'FREE') {
          await band
            .getByRole('heading', {
              name: 'Đồng hành cùng bé & gia đình chu đáo hơn',
            })
            .waitFor()
          assert.equal(await band.locator('time').count(), 0)
        } else {
          assert.ok(new Set(years).size > 1, 'date numbers animate on entry')
          assert.equal(
            years.at(-1),
            '2027',
            'year must not contain thousands separators',
          )
          assert.equal(
            await band.locator('time').getAttribute('aria-label'),
            '11 thg 4, 2027',
          )
        }
        await f.page.waitForTimeout(900)
        assert.equal(
          await band.getByRole('link', { name: label }).getAttribute('href'),
          tier === 'FREE'
            ? '/app/pricing#pricing'
            : '/app/pricing?plan=PLAN_399K',
        )
        const box = await band.boundingBox()
        assert.ok(
          box.y >= 0 && box.y < 150,
          'calendar CTA keeps membership visible',
        )
        await f.page.screenshot({ path: `${output}/membership-${tier}.png` })
        const count = f.state.api.filter(
          (path) => path === 'GET /subscriptions/me',
        ).length
        await f.page.evaluate(() => scrollTo(0, 0))
        await band.scrollIntoViewIfNeeded()
        assert.equal(
          f.state.api.filter((path) => path === 'GET /subscriptions/me').length,
          count,
          'scroll does not fetch subscription',
        )
        assert.equal(f.state.writes.length, 0)
        evidence.push({
          tier,
          action: label,
          dateFrames: [...new Set(years)],
          membershipGap: geometry.gap,
        })
        await f.page.setViewportSize({ width: 390, height: 900 })
        await band.scrollIntoViewIfNeeded()
        await fits(f.page)
        await f.page.screenshot({
          path: `${output}/membership-${tier}-390.png`,
        })
        const mobileLink = await band
          .getByRole('link', { name: label })
          .boundingBox()
        assert.ok(mobileLink.x >= 0 && mobileLink.x + mobileLink.width <= 390)
        await band.getByRole('link', { name: label }).click()
        await f.page.waitForURL((url) =>
          tier === 'FREE'
            ? url.pathname === '/app/pricing' && url.hash === '#pricing'
            : url.pathname === '/app/pricing' &&
              url.searchParams.get('plan') === 'PLAN_399K',
        )
        await f.page
          .locator(tier === 'FREE' ? '.nm-member-pricing' : '.nm-payment-page')
          .waitFor()
        assert.equal(
          f.state.writes.length,
          0,
          'opening upgrade or renewal never starts payment',
        )
        await f.context.close()
      }
    },
  )
  await check(
    'subscription band has loading and unavailable states without showing a false free plan',
    async () => {
      const f = await fixture({
        subscriptionDelay: 1800,
        subscriptionError: true,
      })
      await f.goto('/app')
      await f.page
        .getByRole('status', { name: 'Đang tải gói của bạn' })
        .waitFor()
      await f.page
        .getByText('Chưa tải được thông tin gói của bạn.', { exact: true })
        .waitFor()
      assert.equal(
        await f.page
          .locator('#overview-subscription')
          .getByRole('button')
          .count(),
        0,
      )
      assert.equal(
        await f.page
          .getByRole('heading', {
            name: 'Đồng hành cùng bé & gia đình chu đáo hơn',
          })
          .count(),
        0,
      )
      await f.context.close()
    },
  )
  await check('manual scroll reveals membership without navigation or extra requests', async () => {
    const f = await fixture({ tier: 'PLAN_399K', expiry: '2027-04-11T00:00:00Z', motion: 'no-preference' })
    await f.goto('/app'); await ready(f.page)
    const band = f.page.locator('#overview-subscription')
    await band.getByRole('link', { name: 'Gia hạn thêm gói' }).waitFor({ state: 'attached' })
    assert.equal(await band.getAttribute('data-revealed'), 'false')
    const count = f.state.api.filter(path => path === 'GET /subscriptions/me').length
    await f.page.mouse.wheel(0, 850)
    await f.page.waitForFunction(() => document.querySelector('#overview-subscription').dataset.revealed === 'true')
    await f.page.waitForTimeout(1000)
    assert.equal(new URL(f.page.url()).hash, '')
    assert.equal(await band.locator('.nm-overview-membership__copy').evaluate(el => getComputedStyle(el).opacity), '1')
    assert.equal(await band.locator('time .admin-animated-number').last().locator('span[aria-hidden="true"]').textContent(), '2027')
    assert.equal(f.state.api.filter(path => path === 'GET /subscriptions/me').length, count)
    assert.equal(f.state.writes.length, 0)
    await f.context.close()
  })
  await check('request audit shares calendar reads across StrictMode navigation and focus events and loads assistant on demand', async () => {
    const f = await fixture({ calendarDelay: 150 })
    const count = path => f.state.api.filter(item => item === `GET ${path}`).length
    await f.goto('/app')
    await ready(f.page)
    await f.page.locator('#calendar .calendar-month-grid:not(.is-loading)').waitFor()
    await f.page.locator('.calendar-agenda-skeleton').waitFor({ state: 'hidden' })
    assert.equal(count('/calendar/month'), 1)
    assert.equal(count('/calendar/events'), 1)
    assert.equal(count('/notifications/unread-count'), 1)
    assert.equal(f.state.api.filter(path => path.includes('/assistant/')).length, 0)
    for (let i = 0; i < 4; i++) await f.page.locator('#calendar').getByRole('button', { name: 'Hôm nay', exact: true }).click()
    await f.page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new Event('focus'))
        document.dispatchEvent(new Event('visibilitychange'))
      }
    })
    await f.page.getByRole('link', { name: 'Khám phá dinh dưỡng' }).click()
    await f.page.locator('.nutrition-banner__glass').waitFor()
    await f.page.goBack()
    await ready(f.page)
    await f.page.locator('#calendar .calendar-month-grid:not(.is-loading)').waitFor()
    assert.equal(count('/calendar/month'), 1)
    assert.equal(count('/calendar/events'), 1)
    assert.equal(count('/notifications/unread-count'), 1)
    assert.equal(f.state.api.filter(path => path.includes('/assistant/')).length, 0)
    await f.page.getByRole('button', { name: 'Mở trợ lý NutriMom', exact: true }).click()
    await f.page.waitForFunction(() => document.querySelector('#nutrimom-assistant-window textarea')?.disabled === false)
    const bootstrapCount = f.state.api.filter(path => path.includes('/assistant/')).length
    assert.equal(bootstrapCount, 4)
    await f.page.getByRole('button', { name: 'Đóng trợ lý NutriMom', exact: true }).click()
    await f.page.getByRole('button', { name: 'Mở trợ lý NutriMom', exact: true }).click()
    await f.page.locator('#nutrimom-assistant-window').waitFor()
    assert.equal(f.state.api.filter(path => path.includes('/assistant/')).length, bootstrapCount)
    assert.deepEqual(f.state.cancelled, [])
    evidence.push({ scenario: 'request audit normal', calendarMonth: count('/calendar/month'), calendarEvents: count('/calendar/events'), unreadCount: count('/notifications/unread-count'), assistantBeforeOpen: 0, assistantAfterOpen: bootstrapCount, cancelled: f.state.cancelled })
    await f.context.close()
  })
  await check('request audit rapid calendar navigation only requests the final month and date', async () => {
    const f = await fixture()
    const count = path => f.state.api.filter(item => item === `GET ${path}`).length
    await f.goto('/app')
    await ready(f.page)
    await f.page.locator('#calendar .calendar-month-grid:not(.is-loading)').waitFor()
    await f.page.evaluate(async () => {
      for (let i = 0; i < 6; i++) {
        document.querySelector('#calendar button[aria-label="Sau"]').click()
        await new Promise(resolve => setTimeout(resolve, 25))
      }
    })
    await f.page.locator('#calendar .calendar-month-grid:not(.is-loading)').waitFor()
    await f.page.locator('.calendar-agenda-skeleton').waitFor({ state: 'hidden' })
    assert.equal(count('/calendar/month'), 2, 'initial read plus the final navigation, without intermediate months')
    assert.equal(count('/calendar/events'), 2)
    evidence.push({ scenario: 'request audit rapid calendar', nextMonthClicks: 6, monthReadsIncludingInitial: count('/calendar/month'), eventsReadsIncludingInitial: count('/calendar/events') })
    await f.context.close()
  })
  await check('request audit calendar 429 blocks repeated retries and query changes then permits a manual retry after deadline', async () => {
    const f = await fixture({ limitCalendar: true })
    const count = () => f.state.api.filter(path => path === 'GET /calendar/month').length
    await f.goto('/app')
    await ready(f.page)
    const retry = f.page.locator('#calendar').getByRole('button', { name: 'Thử lại', exact: true })
    await retry.waitFor()
    for (let i = 0; i < 4; i++) await retry.click()
    await f.page.locator('#calendar').getByRole('button', { name: 'Sau', exact: true }).click()
    await retry.waitFor()
    assert.equal(count(), 1)
    await f.page.waitForTimeout(2_100)
    assert.equal(count(), 1, 'cooldown expiry must not schedule an automatic request')
    await retry.click()
    await f.page.locator('#calendar .calendar-month-grid:not(.is-loading)').waitFor()
    assert.equal(count(), 2)
    assert.equal(f.state.writes.length, 0)
    evidence.push({ scenario: 'request audit 429', monthRequestsBeforeDeadline: 1, monthRequestsAfterManualRetry: count(), writes: f.state.writes.length })
    await f.context.close()
  })
  await check('request audit family bootstrap cache is cleared when switching accounts without reloading', async () => {
    const f = await fixture()
    const count = () => f.state.api.filter(path => path === 'GET /family-groups').length
    await f.goto('/app/family')
    await f.page.getByRole('heading', { name: 'Bắt đầu cùng gia đình', exact: true }).waitFor()
    const firstReadAt = Date.now()
    assert.equal(count(), 1)
    await f.page.locator('.nm-avatar-button').click()
    await f.page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
    await f.page.waitForURL('**/login')
    await f.page.locator('.auth-page--login').waitFor()
    Object.assign(f.user, { id: 'family-account-b', display_name: 'Nguyễn Mai' })
    await submitLogin(f.page)
    await f.page.getByRole('heading', { name: 'Chào mẹ Nguyễn Mai' }).waitFor()
    await f.page.getByRole('button', { name: 'Cá nhân', exact: true }).click()
    await f.page.getByRole('link', { name: 'Gia đình', exact: true }).click()
    await f.page.getByRole('heading', { name: 'Bắt đầu cùng gia đình', exact: true }).waitFor()
    assert.equal(count(), 2)
    const elapsed = Date.now() - firstReadAt
    assert.ok(elapsed < 10_000, 'switch before the bootstrap cache TTL expires')
    evidence.push({ scenario: 'request audit family account switch', familyReads: count(), elapsedMs: elapsed })
    await f.context.close()
  })
  assert.deepEqual(unexpected, [])
  assert.deepEqual(errors, [])
  const movie = await stat('public' + videoPath),
    poster = await stat('public' + posterPath)
  assert.ok(movie.size >= 4500000 && movie.size <= 5500000)
  evidence.push({
    videoBytes: movie.size,
    posterBytes: poster.size,
    originalVideoBytes: 30377184,
  })
} finally {
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(
      {
        passed,
        errors,
        unexpected,
        evidence,
        browser: browser.version(),
        scope:
          'Browser with fixture API responses and the actual optimized local video/poster/fonts.',
      },
      null,
      2,
    ),
  )
  await browser.close()
  await server.close()
}
