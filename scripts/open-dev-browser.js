import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { isAutomatedDevProcess } from './dev-browser-policy.mjs'

// An inherited BROWSER setting must not turn QA into a desktop foreground action.
if (process.env.NUTRIMOM_DEV_BROWSER_AUTHORIZED !== '1' || isAutomatedDevProcess(process.env)) {
  process.exit(0)
}

// Vite appends the resolved URL after its CLI arguments; do not assume port 5173.
const url = new URL(process.argv.at(-1))
if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid dev server URL')

const child = spawn('powershell.exe', [
  '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
  '-File', fileURLToPath(new URL('./open-dev-browser.ps1', import.meta.url)),
  '-Url', url.href,
], { stdio: 'inherit', windowsHide: true })

child.on('error', (error) => {
  console.error(`[dev] Could not open Opera: ${error.message}`)
  process.exitCode = 1
})
child.on('exit', (code) => { process.exitCode = code ?? 1 })
