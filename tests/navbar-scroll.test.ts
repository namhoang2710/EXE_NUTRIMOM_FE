import assert from 'node:assert/strict'
import test from 'node:test'
import { nextNavbarScrollState } from '../src/shared/layouts/navbar-scroll.ts'

test('ignores tiny movements, hides downward, and shows after eight pixels upward', () => {
  let state = { lastY: 100, movement: 0, visible: true }
  state = nextNavbarScrollState(state, 104, false)
  assert.equal(state.visible, true)
  state = nextNavbarScrollState(state, 109, false)
  assert.equal(state.visible, false)
  state = nextNavbarScrollState(state, 106, false)
  assert.equal(state.visible, false)
  state = nextNavbarScrollState(state, 101, false)
  assert.equal(state.visible, true)
})

test('always shows near the top and while a menu is open', () => {
  const hidden = { lastY: 200, movement: 0, visible: false }
  assert.equal(nextNavbarScrollState(hidden, 20, false).visible, true)
  assert.equal(nextNavbarScrollState(hidden, 230, true).visible, true)
})
