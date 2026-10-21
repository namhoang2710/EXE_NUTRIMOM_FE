import {
  assert, browser, server, output, fixture, visible, noOverflow, writeFile,
  pageErrors, consoleErrors, unexpected,
} from './helpers/nutrition-browser.mjs'

// Only public recipe reads pass through the Vite proxy to localhost:8080.
// Auth and the page shell use fixtures; this never validates personal mutations.
const responses = []
try {
  const f = await fixture({ realCatalog: true })
  f.page.on('response', async (response) => {
    if (new URL(response.url()).pathname.startsWith('/api/v1/recipes')) {
      responses.push({ url: response.url(), status: response.status(), data: (await response.json()).data })
    }
  })
  await f.page.setViewportSize({ width: 390, height: 1000 })
  const catalogResponse = f.page.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/recipes')
  await f.goto('/app/nutrition?tab=explore')
  const catalog = await (await catalogResponse).json()
  assert.ok(catalog.data.items.length > 0)
  const recipe = catalog.data.items[0]
  await visible(f.page.getByRole('heading', { name: recipe.name, exact: true }))
  await noOverflow(f.page)
  await f.page.screenshot({ path: `${output}/live-catalog-mobile.png`, fullPage: true })
  const detailResponse = f.page.waitForResponse((response) => new URL(response.url()).pathname === `/api/v1/recipes/${recipe.id}`)
  await f.page.locator('.nutrition-recipe-card h3 a').first().click()
  const detail = await (await detailResponse).json()
  assert.equal(detail.data.summary.id, recipe.id)
  await visible(f.page.getByRole('heading', { name: recipe.name, exact: true }))
  await noOverflow(f.page)
  await f.page.screenshot({ path: `${output}/live-recipe-mobile.png`, fullPage: true })
  assert.equal(f.state.counts['GET /recipes'], 1)
  assert.equal(f.state.counts[`GET /recipes/${recipe.id}`], 1)
  assert.deepEqual(f.state.writes, [])
  assert.deepEqual(pageErrors, [])
  assert.deepEqual(consoleErrors, [])
  assert.deepEqual(unexpected, [])
  await writeFile(`${output}/results.json`, JSON.stringify({ passed: ['live public catalog and recipe detail through FE proxy'], responses, counts: f.state.counts, writes: f.state.writes, integration: 'Actual read-only recipe requests to local BE via FE. Account/profile/page shell are fixtures. No personal write validation.' }, null, 2))
  await f.context.close()
} finally {
  await browser.close()
  await server.close()
}
