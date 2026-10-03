import assert from 'node:assert/strict'
import test from 'node:test'
import type { User } from '../src/features/auth/model/auth-types.ts'
import { authenticatedDestination } from '../src/features/auth/model/role-routing.ts'

const user = (roles: string[]) => ({ id: 'user', roles }) as User

test('login keeps the assistant deep link and internal payment return path', () => {
  assert.equal(authenticatedDestination(user(['USER']), 'COMPLETED', '/app/assistant?topic=records#chat'), '/app/assistant?topic=records#chat')
  assert.equal(authenticatedDestination(user(['USER']), undefined, '/payment/success?orderCode=123'), '/payment/success?orderCode=123')
})

test('login return paths preserve role and onboarding boundaries', () => {
  assert.equal(authenticatedDestination(user(['ADMIN']), undefined, '/app/assistant'), '/admin')
  assert.equal(authenticatedDestination(user(['DOCTOR']), undefined, '/app/assistant'), '/expert')
  assert.equal(authenticatedDestination(user(['USER']), 'PROFILE_REQUIRED', '/app/assistant'), '/onboarding/profile')
  for (const path of ['//example.org', 'https://example.org', '/admin', '/expert', '/application', '/login', 42]) {
    assert.equal(authenticatedDestination(user(['USER']), undefined, path), '/app')
  }
})
