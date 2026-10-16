/** Files URLs are API-origin URLs in the verified BE contract, never public-media URLs. */
export function resolveBinaryUrl(value: string, apiBaseUrl: string, pageOrigin: string) {
  const api = new URL(apiBaseUrl, pageOrigin)
  const url = new URL(value, `${api.origin}/`)
  if (url.origin !== api.origin || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Đường dẫn tệp không thuộc máy chủ API được cấu hình.')
  }
  // Preserve root-relative /api/v1 and signed query parameters exactly.
  return url.href
}
