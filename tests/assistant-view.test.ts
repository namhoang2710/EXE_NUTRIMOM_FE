import assert from 'node:assert/strict'
import test from 'node:test'
import { assistantSuggestions, fallbackLabel, isAssistantHref, safeAssistantMessage, safeAssistantOverview } from '../src/features/assistant/model/assistant-view.ts'
import type { AssistantMessageDto, AssistantUserOverview } from '../src/features/assistant/model/assistant-dto.ts'

test('assistant navigation accepts existing feature destinations and article slugs', () => {
  for (const href of ['/app/profile/records', '/app/profile/health', '/app/pricing', '/app/knowledge/dinh-duong-thai-ky', '/app/knowledge/dinh-dưỡng', '/app/consultations/history', '/app/profile/account/password', '/app/settings']) assert.equal(isAssistantHref(href), true)
})
test('assistant rejects external, privileged and malformed navigation targets', () => {
  for (const href of ['javascript:alert(1)', 'https://evil.test', '//evil.test', '/admin', '/app/admin', '/app/knowledge/../admin', '/app/knowledge/%2e%2e', '/app/knowledge/a?redirect=https://evil.test', '/app/profile/records#secret', '/app/knowledge/a\\b']) assert.equal(isAssistantHref(href), false, href)
})
test('unsafe citations and actions are removed without interpreting message text as markup', () => {
  const message: AssistantMessageDto = { id: '1', role: 'ASSISTANT', content: '<script>alert(1)</script>', citations: [
    { id: 'safe', type: 'GUIDE', title: 'Hồ sơ', href: '/app/profile/records', excerpt: '' },
    { id: 'bad', type: 'ARTICLE', title: 'Bad', href: 'javascript:alert(1)', excerpt: '' },
  ], actions: [{ id: 'bad', label: 'Bad', href: '/admin' }], context_used: [], safety_notice: null, escalation_recommended: false, emergency_detected: false, mode: 'AI', fallback_reason: null, created_at: '' }
  const safe = safeAssistantMessage(message)
  assert.equal(safe.content, message.content)
  assert.deepEqual(safe.citations.map(source => source.id), ['safe'])
  assert.deepEqual(safe.actions, [])
})
test('suggestions follow the current feature and acknowledge unfinished nutrition', () => {
  assert.match(assistantSuggestions('/app/profile/records')[0], /lưu kết quả khám/)
  assert.match(assistantSuggestions('/app/pricing')[0], /thanh toán/)
  assert.ok(assistantSuggestions('/app/nutrition').some(text => /hiện có/.test(text)))
})
test('automatic account overview accepts only safe destinations for user data', () => {
  const overview: AssistantUserOverview = { display_name: 'Lan', headline: 'Đã đồng bộ', items: [
    { id: 'profile', label: 'Tài khoản', summary: '', href: '/app/profile' },
    { id: 'bad', label: 'Bad', summary: '', href: 'https://evil.test' },
  ], suggestions: ['Bạn biết gì về tôi?'], context_version: 2, updated_at: '' }
  assert.deepEqual(safeAssistantOverview(overview).items.map(item => item.id), ['profile'])
  assert.equal(safeAssistantOverview(overview).context_version, 2)
})
test('quota and provider failures identify the answer as available guidance', () => {
  for (const reason of ['NOT_READY', 'CONSENT_REQUIRED', 'PROVIDER_LIMIT', 'TIMEOUT', 'PROVIDER_UNAVAILABLE', 'INVALID_RESPONSE']) assert.ok(fallbackLabel(reason))
  assert.match(fallbackLabel('DAILY_LIMIT')!, /hết lượt AI/)
  assert.equal(fallbackLabel(null), null)
})
