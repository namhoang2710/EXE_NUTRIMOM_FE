import { writeFile } from 'node:fs/promises'

const targetUrl = 'http://127.0.0.1:5173/admin/knowledge'
const output = process.argv[2]
if (!output) throw new Error('Provide a screenshot output path')

const targets = await fetch('http://127.0.0.1:9222/json').then((response) => response.json())
const page = targets.find((target) => target.type === 'page')
if (!page) throw new Error('No browser page target found')

const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let sequence = 0
const pending = new Map()
socket.addEventListener('message', (event) => {
  const payload = JSON.parse(event.data)
  if (!payload.id) return
  const handler = pending.get(payload.id)
  if (!handler) return
  pending.delete(payload.id)
  if (payload.error) handler.reject(new Error(payload.error.message))
  else handler.resolve(payload.result)
})

function command(method, params = {}) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

const session = {
  accessToken: 'qa-access-token', refreshToken: '', accessExpiresAt: Date.now() + 60_000,
  refreshExpiresAt: Date.now() + 60_000, tokenType: 'Bearer',
  user: { id: 'admin-1', phone: '0900000000', displayName: 'Content Admin', roles: ['ADMIN'], status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z' },
}
await command('Runtime.evaluate', { expression: `sessionStorage.setItem('nutrimom.auth-session', ${JSON.stringify(JSON.stringify(session))})` })
await command('Page.navigate', { url: targetUrl })
await new Promise((resolve) => setTimeout(resolve, 2500))
if (process.argv.includes('--editor')) {
  await command('Runtime.evaluate', {
    expression: `Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Bài viết mới'))?.click()`,
  })
  await new Promise((resolve) => setTimeout(resolve, 500))
}
const screenshot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true })
await writeFile(output, Buffer.from(screenshot.data, 'base64'))
socket.close()
