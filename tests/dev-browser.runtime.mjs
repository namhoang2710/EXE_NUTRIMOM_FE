// Uses a recording browser stub, never the user's Opera or desktop.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { createServer, resolveConfig } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const temp = await mkdtemp(join(tmpdir(), 'nutrimom-dev-browser-'))
const log = join(temp, 'opens.txt')
const recorder = join(temp, 'browser.js')
await writeFile(recorder, "require('node:fs').appendFileSync(process.env.DEV_BROWSER_TEST_LOG, 'open\\n')")
const originalBrowser = process.env.BROWSER
const originalLog = process.env.DEV_BROWSER_TEST_LOG
process.env.BROWSER = recorder
process.env.DEV_BROWSER_TEST_LOG = log
let server
let child
const opens = async () => await readFile(log, 'utf8').catch(() => '')

try {
  server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' })
  assert.equal(server.config.server.open, false)
  assert.equal(server.config.preview.open, false)
  await server.listen()
  await server.restart()
  await delay(300)
  assert.equal(await opens(), '', 'programmatic dev/restart must not open tabs')
  await server.close()
  server = undefined

  // Verify the stub itself works: one initial open, no extra open on restart.
  server = await createServer({ root, server: { host: '127.0.0.1', port: 0, open: true }, logLevel: 'error' })
  await server.listen()
  for (let attempt = 0; attempt < 100 && !(await opens()); attempt++) await delay(50)
  assert.equal(await opens(), 'open\n')
  await server.restart()
  await delay(300)
  assert.equal(await opens(), 'open\n')
  await server.close()
  server = undefined
  await writeFile(log, '')

  // Explicit --open and inherited BROWSER must still be silent under Codex.
  child = spawn(process.execPath, ['scripts/dev.mjs', '--host', '127.0.0.1', '--port', '0', '--open'], {
    cwd: root, env: { ...process.env, CODEX_CI: '1', NO_COLOR: '1' },
    stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
  })
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk })
  child.stderr.on('data', (chunk) => { output += chunk })
  for (let attempt = 0; attempt < 200 && !output.includes('Local:') && child.exitCode === null; attempt++) await delay(50)
  assert.match(output, /Local:/, output)
  await delay(500)
  assert.equal(await opens(), '', 'automated CLI must ignore --open and inherited browser')
  const config = await resolveConfig({}, 'serve')
  assert.equal(config.preview.open, false)
  console.log('PASS: shared dev/preview default closed; one opt-in open; restart silent; automated CLI silent.')
} finally {
  if (child && child.exitCode === null) {
    const exit = once(child, 'exit')
    child.kill()
    await exit
  }
  if (server) await server.close()
  if (originalBrowser === undefined) delete process.env.BROWSER
  else process.env.BROWSER = originalBrowser
  if (originalLog === undefined) delete process.env.DEV_BROWSER_TEST_LOG
  else process.env.DEV_BROWSER_TEST_LOG = originalLog
  await rm(temp, { recursive: true, force: true })
}
