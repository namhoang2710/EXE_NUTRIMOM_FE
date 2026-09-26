import assert from 'node:assert/strict'
import test from 'node:test'
import { focusTargetForTab, restoreDialogFocus, scrollbarGutter, shouldCloseDialogForKey } from '../src/shared/model/dialog-focus.ts'

test('focus trap wraps forward and backward at dialog edges', () => {
  const first = {} as HTMLElement
  const middle = {} as HTMLElement
  const last = {} as HTMLElement
  const focusable = [first, middle, last]
  assert.equal(focusTargetForTab(focusable, last, false), first)
  assert.equal(focusTargetForTab(focusable, first, true), last)
  assert.equal(focusTargetForTab(focusable, middle, false), null)
})

test('Escape closes only while the dialog is not busy', () => {
  assert.equal(shouldCloseDialogForKey('Escape', false), true)
  assert.equal(shouldCloseDialogForKey('Escape', true), false)
  assert.equal(shouldCloseDialogForKey('Enter', false), false)
})

test('scroll lock gutter is non-negative and focus is restored to opener', () => {
  assert.equal(scrollbarGutter(1280, 1263), 17)
  assert.equal(scrollbarGutter(360, 375), 0)
  let focused = false
  restoreDialogFocus({ focus: () => { focused = true } } as HTMLElement)
  assert.equal(focused, true)
})
