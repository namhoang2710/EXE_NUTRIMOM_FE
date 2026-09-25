const DEFAULT_API_BASE_URL = '/api/v1'
const DEFAULT_API_TIMEOUT_MS = 15_000

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, ''),
  apiTimeoutMs: parsePositiveInteger(import.meta.env.VITE_API_TIMEOUT_MS, DEFAULT_API_TIMEOUT_MS),
} as const
