import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { ErrorCodes } from '../src/core/api/error-code.ts'
import { ASSISTANT_RATE_LIMIT_MESSAGE, assistantCanRetry, assistantErrorMessage, assistantRetryAvailableAt, createAssistantSendGate } from '../src/features/assistant/model/assistant-request.ts'

test('assistant send gate trims content, rejects empty messages, and blocks duplicate submits synchronously', () => {
  const gate = createAssistantSendGate()
  assert.equal(gate.tryAcquire('   '), null)
  assert.equal(gate.tryAcquire('  Xin chào  '), 'Xin chào')
  assert.equal(gate.isLocked(), true)
  assert.equal(gate.tryAcquire('Xin chào'), null)
  gate.release()
  assert.equal(gate.tryAcquire('Câu hỏi tiếp theo'), 'Câu hỏi tiếp theo')
  gate.reset()
  assert.equal(gate.isLocked(), false)
})

test('assistant 429 handling is friendly, retryable, and honors Retry-After without an automatic loop', () => {
  const error = new ApiClientError(429, { code: ErrorCodes.requestFailed, message: 'Too many requests' }, 7_000)
  assert.equal(assistantErrorMessage(error), ASSISTANT_RATE_LIMIT_MESSAGE)
  assert.equal(assistantCanRetry(error), true)
  assert.equal(assistantRetryAvailableAt(error, 10_000), 17_000)
})

test('assistant avatar and request lifecycle are wired through shared components', async () => {
  const [avatar, widget, panel, provider, api, css] = await Promise.all([
    readFile(new URL('../src/features/assistant/components/NutriMomBotAvatar.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/assistant/components/AssistantWidget.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/assistant/components/AssistantPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/assistant/components/AssistantProvider.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/assistant/api/assistant-api.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/assistant/styles/assistant.css', import.meta.url), 'utf8'),
  ])

  assert.match(avatar, /includes\('cat'\)\s*\?\s*'cat'\s*:\s*'flower'/)
  assert.match(avatar, /face="mouth"/)
  assert.match(avatar, /shading="fabric"/)
  assert.equal((widget.match(/id="nutrimom-assistant-window"/g) || []).length, 1)
  assert.doesNotMatch(widget, /Hỏi NutriMom<\/span>/)
  assert.match(widget, /interactive=\{!assistant\.open\}/)
  assert.match(widget, /size=\{56\}/)
  assert.equal((panel.match(/<NutriMomBotAvatar/g) || []).length, 1)
  assert.match(panel, /assistant\.busy\s*\?\s*'working'\s*:\s*'default'/)
  assert.match(provider, /createAssistantSendGate/)
  assert.match(provider, /viewController\.current\?\.abort\(\)/)
  assert.doesNotMatch(provider, /\[enabled, loaded, open, pathname/)
  assert.match(api, /idempotencyKey:\s*body\.client_message_id/)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
  assert.match(css, /max-width:\s*380px/)
})
