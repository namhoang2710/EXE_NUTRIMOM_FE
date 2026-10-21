import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { devBrowserLaunchOptions } from './dev-browser-policy.mjs'

// Only a human terminal opts in. Codex/CI and piped commands stay silent,
// including when a caller supplies --open or an inherited BROWSER handler.
const launch = devBrowserLaunchOptions({
  args: process.argv.slice(2),
  env: process.env,
  stdinIsTTY: process.stdin.isTTY,
  stdoutIsTTY: process.stdout.isTTY,
  platform: process.platform,
  opener: fileURLToPath(new URL('./open-dev-browser.js', import.meta.url)),
})
process.argv.splice(2, process.argv.length - 2, ...launch.args)
if (launch.browser !== undefined) process.env.BROWSER = launch.browser
process.env.NUTRIMOM_DEV_BROWSER_AUTHORIZED = launch.open ? '1' : '0'

const require = createRequire(import.meta.url)
const viteRoot = dirname(require.resolve('vite/package.json'))
await import(pathToFileURL(resolve(viteRoot, 'bin/vite.js')).href)
