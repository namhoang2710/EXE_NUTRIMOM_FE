import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { formatVietnamDate, isCalendarDate, vietnamDateTimeInput, vietnamLocalDateTimeToIso } from '../src/core/date-time/vietnam.ts'

test('Vietnam form times reject invalid dates and cross UTC midnight correctly', () => {
  assert.equal(vietnamLocalDateTimeToIso('2026-10-24T00:15'), '2026-10-23T17:15:00.000Z')
  assert.equal(vietnamDateTimeInput('2026-10-23T17:15:00Z'), '2026-10-24T00:15')
  for (const value of ['2026-02-29T09:00', '2026-10-24T24:00', '2026-10-24T09:60', 'invalid']) assert.equal(vietnamLocalDateTimeToIso(value), undefined)
  assert.equal(isCalendarDate('2024-02-29'), true)
  assert.equal(isCalendarDate('2026-02-29'), false)
  assert.equal(formatVietnamDate('2026-02-31'), '')
})

test('business date labels, article publication, task and reminder instants are identical in four device timezones', () => {
  const moduleUrl = new URL('../src/core/date-time/vietnam.ts', import.meta.url).href
  const familyUrl = new URL('../src/features/family/model/family-formatters.ts', import.meta.url).href
  const articleUrl = new URL('../src/features/knowledge/model/article-form.ts', import.meta.url).href
  const calendarUrl = new URL('../src/features/calendar/model/calendar-helpers.ts', import.meta.url).href
  const authUrl = new URL('../src/core/auth/date.ts', import.meta.url).href
  const script = `import * as vn from ${JSON.stringify(moduleUrl)};
    import { toIsoTimestamp } from ${JSON.stringify(familyUrl)};
    import { emptyArticleForm, articleFormToPayload } from ${JSON.stringify(articleUrl)};
    import { localDateTimeToUtc, formatEventTime, medicalRecordReminderDefaults } from ${JSON.stringify(calendarUrl)};
    import { todayDate } from ${JSON.stringify(authUrl)};
    console.log(JSON.stringify({ birthday: vn.formatVietnamDate('1994-06-12'),
      today: todayDate(new Date('2026-10-23T18:00:00Z')),
      form: vn.vietnamDateTimeInput('2026-10-23T18:00:00Z'),
      task: toIsoTimestamp('2026-10-24T01:00'), reminder: localDateTimeToUtc('2026-10-24T01:00'),
      article: articleFormToPayload({...emptyArticleForm(), status:'published', publishedAt:'2026-10-24T01:00'}).publishedAt,
      label: formatEventTime({starts_at:'2026-10-23T18:00:00Z',source:'REMINDER'}),
      followUp: medicalRecordReminderDefaults('2026-01-01T01:00:00Z',new Date('2026-10-23T18:00:00Z')).startsAtLocal }));`
  for (const TZ of ['UTC', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles', 'Asia/Tokyo']) {
    const result = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', script], { env: { ...process.env, TZ }, encoding: 'utf8' }))
    assert.deepEqual(result, { birthday: '12/06/1994', today: '2026-10-24', form: '2026-10-24T01:00', task: '2026-10-23T18:00:00.000Z', reminder: '2026-10-23T18:00:00.000Z', article: '2026-10-23T18:00:00.000Z', label: '01:00', followUp: '2026-10-25T09:00' }, TZ)
  }
})
