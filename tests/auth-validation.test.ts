import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidPhone, isValidRegisterPassword, registerPasswordError, registerFieldError, loginPasswordError, loginIdentifierError, mapRegisterFieldErrors } from '../src/features/auth/model/auth-validation.ts'

test('accepts backend Vietnamese phone formats without blocking separators', () => {
  for (const phone of ['0901234567', '+84 901 234 567', '84(901)-234.567']) assert.equal(isValidPhone(phone), true, phone)
  for (const phone of ['12345', '0201234567', '090123456789012345678', '+0901234567', '+ 0901234567', '09abc34567']) assert.equal(isValidPhone(phone), false, phone)
})

test('matches BE PasswordPolicy: 8–20 characters, upper/lowercase, number, special, no whitespace', () => {
  for (const password of ['Abcd123!', `Aa1!${'x'.repeat(16)}`]) assert.equal(isValidRegisterPassword(password), true, password)
  for (const password of ['abc12345', 'abcdefgh', '12345678', 'Abc123!', 'ABCD123!', 'abcd123!', 'Abcdefg!', 'Abcdef12', 'Aa1!aaaa a', 'Aa1!aaaa\n', `Aa1!${'x'.repeat(17)}`]) {
    assert.equal(isValidRegisterPassword(password), false, password)
  }
})

test('password feedback identifies only the missing requirements', () => {
  assert.equal(registerPasswordError('Abcdef12'), 'Cần: ký tự đặc biệt.')
  assert.equal(registerPasswordError('a1!'), 'Cần: thêm 5 ký tự, chữ hoa.')
  assert.equal(registerPasswordError('Abcd123!'), '')
})

const form = { displayName: 'An', email: 'an@example.com', phone: '', password: 'Abcd123!', confirmPassword: 'Abcd123!', accepted: true }

test('registration validates optional phone, required confirmation, email and name limits', () => {
  assert.equal(registerFieldError('phone', form), '')
  assert.match(registerFieldError('phone', { ...form, phone: 'abc' }), /chữ cái/)
  assert.match(registerFieldError('phone', { ...form, phone: '09012' }), /10 số/)
  assert.match(registerFieldError('confirmPassword', { ...form, confirmPassword: '' }), /xác nhận/)
  assert.match(registerFieldError('confirmPassword', { ...form, password: 'Changed1!' }), /khớp/)
  assert.match(registerFieldError('email', { ...form, email: `${'a'.repeat(250)}@a.com` }), /255/)
  assert.match(registerFieldError('displayName', { ...form, displayName: 'x'.repeat(101) }), /100/)
})

test('login keeps compatibility with existing passwords and BE length limits', () => {
  assert.equal(loginPasswordError('oldpassword'), '')
  assert.match(loginPasswordError(' '.repeat(4)), /nhập mật khẩu/)
  assert.match(loginPasswordError('x'.repeat(73)), /72/)
  assert.match(loginIdentifierError(`${'x'.repeat(95)}@a.com`), /100/)
  assert.equal(loginIdentifierError('an@example.com'), '')
})

test('BE snake_case and camelCase field errors bind to the correct registration inputs', () => {
  assert.deepEqual(mapRegisterFieldErrors({ display_name: 'name', accepted_terms: 'terms', email: 'email' }), { displayName: 'name', accepted: 'terms', email: 'email' })
  assert.deepEqual(mapRegisterFieldErrors({ acceptedTerms: 'terms' }), { accepted: 'terms' })
})
