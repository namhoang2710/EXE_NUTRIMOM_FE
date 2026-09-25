import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidPhone, isValidRegisterPassword } from '../src/features/auth/model/auth-validation.ts'

test('accepts backend Vietnamese phone formats without blocking separators', () => {
  for (const phone of ['0901234567', '+84 901 234 567', '84(901)-234.567']) assert.equal(isValidPhone(phone), true, phone)
  for (const phone of ['12345', '0201234567', '090123456789012345678']) assert.equal(isValidPhone(phone), false, phone)
})

test('requires an 8 to 72 character registration password with a letter and digit', () => {
  assert.equal(isValidRegisterPassword('abc12345'), true)
  assert.equal(isValidRegisterPassword('abcdefgh'), false)
  assert.equal(isValidRegisterPassword('12345678'), false)
  assert.equal(isValidRegisterPassword(`a1${'x'.repeat(71)}`), false)
})
