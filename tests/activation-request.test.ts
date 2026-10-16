import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { activateOnce, activationErrorMessage, isUsedOrInvalidActivation } from '../src/features/auth/model/activation-request.ts'

test('the same activation code is sent only once while the first request is pending', async () => {
  let calls = 0
  let release!: (value: string) => void
  const run = () => { calls += 1; return new Promise<string>((resolve) => { release = resolve }) }

  // React StrictMode runs the page effect twice: both runs must share one request.
  const first = activateOnce('123456', 'Mom@Example.test', run)
  const second = activateOnce('123456', ' mom@example.test ', run)
  assert.equal(first, second)
  release('user')
  assert.deepEqual(await Promise.all([first, second]), ['user', 'user'])
  assert.equal(calls, 1)
})

test('a finished or different activation is not reused', async () => {
  let calls = 0
  const run = async () => { calls += 1; return calls }
  assert.equal(await activateOnce('111111', 'a@example.test', run), 1)
  assert.equal(await activateOnce('111111', 'a@example.test', run), 2)
  assert.equal(await activateOnce('222222', 'a@example.test', run), 3)
})

test('a failed activation releases the code so the user can retry', async () => {
  let calls = 0
  const failing = async () => { calls += 1; throw new Error('network') }
  await assert.rejects(activateOnce('333333', undefined, failing), /network/)
  await assert.rejects(activateOnce('333333', undefined, failing), /network/)
  assert.equal(calls, 2)
})

test('used or invalid codes suggest logging in instead of a generic failure', () => {
  const used = new ApiClientError(400, { code: 'INVALID_ACTIVATION_TOKEN', message: 'used' })
  assert.equal(isUsedOrInvalidActivation(used), true)
  assert.match(activationErrorMessage(used, 'fallback'), /đã được sử dụng.*đăng nhập/)

  const expired = new ApiClientError(400, { code: 'ACTIVATION_TOKEN_EXPIRED', message: 'Mã kích hoạt đã hết hạn.' })
  assert.equal(isUsedOrInvalidActivation(expired), false)
  assert.equal(activationErrorMessage(expired, 'fallback'), 'Mã kích hoạt đã hết hạn.')
  assert.equal(activationErrorMessage(new Error('boom'), 'fallback'), 'fallback')
})

test('activation page routes every activation through the single-request guard', async () => {
  const page = await readFile(new URL('../src/features/auth/pages/ActivateAccountPage.tsx', import.meta.url), 'utf8')
  assert.equal((page.match(/activateOnce\(/g) ?? []).length, 2)
  assert.doesNotMatch(page, /await activateAccount\(/)
})
