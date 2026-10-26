export function brandDisplayName(name: string | undefined) {
  const text = name?.trim() || 'NutriMom'
  return /^(?:nutri\s*mom\s+)?local\s+admin$/i.test(text) ? 'NutriMom' : text
}

/** Display old LocalTime messages without fractional seconds; never reinterpret their timezone. */
export function compactNotificationBody(body: string) {
  return body.replace(/\b([01]\d|2[0-3]):([0-5]\d):[0-5]\d\.\d{1,9}\b/g, '$1:$2')
}
