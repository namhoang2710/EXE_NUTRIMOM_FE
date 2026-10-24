// Optional authoring tool: SHARP_MODULE may point to a separately installed sharp.
// It is deliberately not a runtime/build dependency. Originals stay untouched.
import { createRequire } from 'node:module'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
const require = createRequire(import.meta.url)
const sharp = require(process.env.SHARP_MODULE || 'sharp')
const root = resolve(import.meta.dirname, '..')
const manifestPath = resolve(root, 'docs/public-image-optimization.json')
const previous = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '[]'))
const references = new Map(previous.map(item => [item.source, item]))
async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? sourceFiles(resolve(dir, entry.name)) : /\.(tsx?|css)$/.test(entry.name) ? [resolve(dir, entry.name)] : []))
  return nested.flat()
}
const sources = await sourceFiles(resolve(root, 'src'))
for (const file of sources) {
  const text = await readFile(file, 'utf8')
  for (const match of text.matchAll(/["'(](\/(?!optimized\/)[\w/.-]+\.(?:png|jpe?g))["')]/gi)) references.set(match[1], references.get(match[1]))
}
const optimized = []
for (const [source] of references) {
  const input = resolve(root, 'public', '.' + source)
  const info = await stat(input).catch(() => null)
  if (!info || info.size < 80_000) continue
  const target = '/optimized' + source.slice(0, -extname(source).length) + '.webp'
  const output = resolve(root, 'public', '.' + target)
  await mkdir(dirname(output), { recursive: true })
  const result = await sharp(input).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 88, effort: 5 }).toFile(output)
  optimized.push({ source, target, before: info.size, after: result.size, width: result.width, height: result.height })
}
for (const file of sources) {
  let text = await readFile(file, 'utf8')
  const before = text
  for (const { source, target } of optimized) text = text.replaceAll(`'${source}'`, `'${target}'`).replaceAll(`"${source}"`, `"${target}"`).replaceAll(`(${source})`, `(${target})`)
  if (text !== before) await writeFile(file, text)
}
await writeFile(manifestPath, JSON.stringify(optimized, null, 2) + '\n')
console.log(JSON.stringify({ files: optimized.length, before: optimized.reduce((n, a) => n + a.before, 0), after: optimized.reduce((n, a) => n + a.after, 0) }))
