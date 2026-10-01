export const FAMILY_LOADING_MINIMUM_MS = 1500

export async function waitForFamilyLoading(startedAt: number) {
  const remaining = FAMILY_LOADING_MINIMUM_MS - (Date.now() - startedAt)
  if (remaining <= 0) return
  await new Promise<void>((resolve) => window.setTimeout(resolve, remaining))
}
