export function formatAdminDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: withTime ? undefined : 'numeric',
    hour: withTime ? '2-digit' : undefined,
    minute: withTime ? '2-digit' : undefined,
  }).format(new Date(value))
}

export function getInitials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}
