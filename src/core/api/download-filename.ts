export function downloadFilename(header: string | null) {
  if (!header) return null
  const encoded = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  const plain = header.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i)
  let name = plain?.[1] || plain?.[2]?.trim()
  if (encoded) { try { name = decodeURIComponent(encoded[1].trim()) } catch { return null } }
  if (!name || /[\\/]/.test(name) || [...name].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) || name === '.' || name === '..') return null
  return name.slice(0,200)
}
