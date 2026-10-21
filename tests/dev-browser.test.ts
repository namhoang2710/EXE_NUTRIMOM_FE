import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const policyUrl = new URL('../scripts/dev-browser-policy.mjs', import.meta.url).href
const { devBrowserLaunchOptions } = await import(policyUrl)
const manual = {
  args: [], env: {}, stdinIsTTY: true, stdoutIsTTY: true,
  platform: 'win32', opener: 'C:/project/scripts/open-dev-browser.js',
}

test('interactive dev opts into one browser open and preserves Vite arguments', () => {
  const result = devBrowserLaunchOptions({ ...manual, args: ['--port', '5180'] })
  assert.equal(result.open, true)
  assert.equal(result.browser, manual.opener)
  assert.deepEqual(result.args, ['--port', '5180', '--open'])
  for (const args of [['--open'], ['--open=/nutrition'], ['--open', '/nutrition']]) {
    assert.deepEqual(devBrowserLaunchOptions({ ...manual, args }).args, args)
  }
})

test('automation cannot open a browser even with a TTY and explicit --open', () => {
  for (const env of [{ CI: 'true' }, { CODEX_CI: '1' }, { CODEX_TOOL_CALL_ID: 'tool-123' }]) {
    const result = devBrowserLaunchOptions({
      ...manual, args: ['--open'], env: { ...env, BROWSER: 'custom-browser.js' },
    })
    assert.equal(result.open, false)
    assert.equal(result.browser, 'none')
  }
})

test('piped and headless launches never open a browser', () => {
  for (const tty of [{ stdinIsTTY: false }, { stdoutIsTTY: false }]) {
    assert.equal(devBrowserLaunchOptions({ ...manual, ...tty }).browser, 'none')
  }
  const result = devBrowserLaunchOptions({ ...manual, args: ['--no-browser', '--port', '5181'] })
  assert.equal(result.browser, 'none')
  assert.deepEqual(result.args, ['--port', '5181'])
})

test('explicit browser preferences and ordinary terminal metadata are respected', () => {
  for (const BROWSER of ['none', 'NONE']) {
    assert.equal(devBrowserLaunchOptions({ ...manual, env: { BROWSER } }).open, false)
  }
  const env = { CI: 'false', CODEX_CI: '0', CODEX_THREAD_ID: 'thread', CODEX_SHELL: '1' }
  assert.equal(devBrowserLaunchOptions({ ...manual, env }).open, true)
  assert.equal(devBrowserLaunchOptions({ ...manual, env: { BROWSER: 'custom.js' } }).browser, 'custom.js')
  assert.equal(devBrowserLaunchOptions({ ...manual, platform: 'linux' }).browser, undefined)
})

test('Opera helper exits before parsing URL when unauthorized or automated', () => {
  const helper = fileURLToPath(new URL('../scripts/open-dev-browser.js', import.meta.url))
  for (const env of [
    { NUTRIMOM_DEV_BROWSER_AUTHORIZED: '0' },
    { NUTRIMOM_DEV_BROWSER_AUTHORIZED: '1', CODEX_CI: '1' },
    { NUTRIMOM_DEV_BROWSER_AUTHORIZED: '1', CODEX_TOOL_CALL_ID: 'tool-123' },
  ]) {
    const result = spawnSync(process.execPath, [helper, 'invalid-url'], {
      env: { ...process.env, ...env }, encoding: 'utf8', timeout: 10_000, windowsHide: true,
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout, '')
  }
})
