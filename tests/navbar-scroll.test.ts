import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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

test('user header uses a responsive clip-path animation without replacing real navigation links', async () => {
  const tabs = await readFile(new URL('../src/components/ui/animated-tabs.tsx', import.meta.url), 'utf8')
  const navbar = await readFile(new URL('../src/shared/layouts/AuthenticatedNavbar.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/shared/styles/authenticated.css', import.meta.url), 'utf8')
  assert.match(tabs, /clipElement\.style\.clipPath/)
  assert.match(tabs, /ResizeObserver/)
  assert.match(navbar, /<AnimatedTabs tabs=\{animatedTabs\}/)
  assert.match(navbar, /<NavLink to="\/app"/)
  assert.match(navbar, /<Link to="\/app\/profile\/health"[^]*>Hồ sơ cá nhân<\/Link>/)
  assert.match(styles, /transition: clip-path 360ms/)
  assert.match(styles, /@media \(max-width: 1100px\).*\.nm-animated-tabs-clip \{ display: none; \}/)
})
