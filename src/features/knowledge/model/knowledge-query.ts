export function buildKnowledgeQueryString(query: object) {
  const params = new URLSearchParams()
  Object.entries(query as Record<string, string | number | boolean | undefined>).forEach(([name, value]) => {
    if (value !== undefined && value !== '') params.set(name, String(value))
  })
  const value = params.toString()
  return value ? `?${value}` : ''
}
