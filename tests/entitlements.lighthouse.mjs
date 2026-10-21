import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { planDtos, entitlementsFor } from './fixtures/subscription-plans.ts'

// QA-only tools live in an ignored directory; production dependencies are unchanged.
const { default: lighthouse } = await import('../qa-artifacts/entitlements/tools/node_modules/lighthouse/core/index.js')
const { default: desktopConfig } = await import('../qa-artifacts/entitlements/tools/node_modules/lighthouse/core/config/desktop-config.js')
const { launch } = await import('../qa-artifacts/entitlements/tools/node_modules/chrome-launcher/dist/index.js')
const user = { id: 'lighthouse-fixture', phone: '0901112233', display_name: 'Minh Anh', role: 'MOM', roles: ['USER'], status: 'ACTIVE', onboarding_status: 'COMPLETED', created_at: '2026-10-01T00:00:00Z' }
const session = { accessToken: 'qa-only', refreshToken: 'qa-only-refresh', tokenType: 'Bearer', accessExpiresAt: Date.now() + 3600_000, refreshExpiresAt: Date.now() + 86400_000, user: { ...user, displayName: user.display_name, onboardingStatus: 'COMPLETED' } }
const root = path.resolve('dist')
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.html': 'text/html' }
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname
    if (pathname.startsWith('/api/v1/')) {
      const api = pathname.replace('/api/v1', '')
      const data = api === '/subscription-plans' ? planDtos : api === '/subscriptions/me' ? entitlementsFor('PLAN_99K') : api === '/auth/me' ? user : api === '/users/me' ? { ...user, version: 1, email: 'qa@example.test' } : api === '/notifications/unread-count' ? { unread_count: 0 } : []
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ data })); return
    }
    const asset = pathname.startsWith('/assets/') || Boolean(path.extname(pathname))
    const filename = asset ? path.resolve(root, `.${pathname}`) : path.join(root, 'index.html')
    if (!filename.startsWith(`${root}${path.sep}`)) { res.writeHead(403); res.end(); return }
    let content = await readFile(filename)
    if (!asset) content = Buffer.from(content.toString().replace('<head>', `<head><script>sessionStorage.setItem('nutrimom.auth-session', ${JSON.stringify(JSON.stringify(session))});localStorage.setItem('nutrimom.theme','light')</script>`))
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' }); res.end(content)
  } catch { res.writeHead(404); res.end() }
})
await new Promise((resolve) => server.listen(5194, '127.0.0.1', resolve))
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run'] })
try {
  for (const formFactor of ['desktop', 'mobile']) {
    const result = await lighthouse('http://127.0.0.1:5194/app/pricing', { port: chrome.port, logLevel: 'error', output: ['json', 'html'], onlyCategories: ['performance', 'accessibility', 'best-practices'], formFactor, screenEmulation: formFactor === 'desktop' ? { mobile: false, width: 1440, height: 1000, deviceScaleFactor: 1, disabled: false } : { mobile: true, width: 375, height: 812, deviceScaleFactor: 1, disabled: false } }, formFactor === 'desktop' ? desktopConfig : undefined)
    await writeFile(`qa-artifacts/entitlements/lighthouse-${formFactor}.json`, result.report[0])
    await writeFile(`qa-artifacts/entitlements/lighthouse-${formFactor}.html`, result.report[1])
    const { lhr } = result
    console.log(JSON.stringify({ formFactor, scores: Object.fromEntries(Object.entries(lhr.categories).map(([key, value]) => [key, value.score])), lcp: lhr.audits['largest-contentful-paint'].numericValue, cls: lhr.audits['cumulative-layout-shift'].numericValue, failures: Object.values(lhr.audits).filter((audit) => audit.score !== null && audit.score < 1 && Array.isArray(audit.details?.items)).map((audit) => ({ id: audit.id, title: audit.title, elements: audit.details.items.slice(0, 5).map((item) => item.node?.snippet || item.url) })) }))
  }
} finally { await chrome.kill(); server.close() }
