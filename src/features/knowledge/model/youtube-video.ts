const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/u

export function isValidYoutubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && VIDEO_ID.test(value)
}

export function parseYoutubeVideoId(input: string): string | null {
  const value = input.trim()
  if (isValidYoutubeVideoId(value)) return value

  let url: URL
  try { url = new URL(value) } catch { return null }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null

  const host = url.hostname.toLowerCase()
  let id: string | null = null
  if (host === 'youtu.be') {
    const match = /^\/([^/]+)\/?$/u.exec(url.pathname)
    id = match?.[1] ?? null
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
    if (url.pathname === '/watch') {
      const values = url.searchParams.getAll('v')
      id = values.length === 1 ? values[0] : null
    } else {
      const match = /^\/(?:shorts|embed)\/([^/]+)\/?$/u.exec(url.pathname)
      id = match?.[1] ?? null
    }
  }
  return isValidYoutubeVideoId(id) ? id : null
}
