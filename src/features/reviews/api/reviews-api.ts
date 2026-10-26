import { apiClient, type ApiRequestOptions } from '../../../core/api/api-client.ts'
import { ApiClientError } from '../../../core/api/api-error.ts'
import { createResourceCache, forConsumer } from '../../../core/api/resource-cache.ts'
import { createFeatureCooldown } from '../../../core/api/feature-cooldown.ts'
import { getSessionScope } from '../../../core/auth/token-store.ts'
import { requireCurrentScope } from '../../../core/api/profile-requests.ts'
import { parseOwnReview, parseReviewPage, parseReviewSummary, reviewQuery, type AdminReview, type MyReview, type PublicReview, type ReviewFilters } from '../model/review-types.ts'

const publicCache = createResourceCache(60_000), ownCache = createResourceCache(90_000), adminCache = createResourceCache(30_000)
export const reviewCooldown = createFeatureCooldown()
const controllers = new Set<AbortController>()
export const REVIEW_CHANGED = 'nutrimom:reviews-changed'
export function reviewFamily(kind: 'public' | 'own' | 'admin') { return kind === 'public' ? 'reviews-public' : `${getSessionScope()}:reviews-${kind}` }

if (typeof window !== 'undefined') {
  const clear = () => { for (const controller of controllers) controller.abort(); controllers.clear(); ownCache.clear(); adminCache.clear() }
  window.addEventListener('nutrimom:session-changed', clear)
  window.addEventListener('nutrimom:session-cleared', clear)
}
async function request<T>(kind: 'public' | 'own' | 'admin', path: string, options: ApiRequestOptions = {}) {
  const family = reviewFamily(kind)
  const previousUntil = reviewCooldown.until(family)
  reviewCooldown.assert(family)
  try { const result = await apiClient.request<T>(path, { ...options, authenticated: kind !== 'public' }); reviewCooldown.clearExpired(family, previousUntil); return result }
  catch (error) { reviewCooldown.record(family, error); throw error }
}
function read<T>(kind: 'public' | 'own' | 'admin', path: string, force = false, signal?: AbortSignal) {
  const cache = kind === 'public' ? publicCache : kind === 'own' ? ownCache : adminCache
  const key = `${kind === 'public' ? 'public' : getSessionScope()}:${path}`
  if (force) cache.expire(key)
  return forConsumer(cache.run(key, async () => {
    const controller = new AbortController()
    if (kind !== 'public') controllers.add(controller)
    try { return await request<T>(kind, path, { signal: controller.signal }) }
    catch (error) { if (kind === 'own' && path === '/reviews/me' && error instanceof ApiClientError && error.status === 404 && error.code === 'WEB_REVIEW_NOT_FOUND') return null as T; throw error }
    finally { controllers.delete(controller) }
  }), signal)
}
export function invalidateReviews() {
  publicCache.clear(); ownCache.clear(); adminCache.clear()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(REVIEW_CHANGED))
}
async function mutate<T>(kind: 'own' | 'admin', path: string, method: string, body?: unknown) {
  const scope = getSessionScope()
  const result = await request<T>(kind, path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  requireCurrentScope(scope)
  invalidateReviews()
  return result
}
export const reviewsApi = {
  summary: (force = false, signal?: AbortSignal) => read<unknown>('public', '/reviews/summary', force, signal).then(parseReviewSummary),
  list: (filters: ReviewFilters = {}, cursor?: string, limit = 10, force = false, signal?: AbortSignal) => read<unknown>('public', `/reviews?${reviewQuery(filters, cursor, limit)}`, force, signal).then(value => parseReviewPage<PublicReview>(value)),
  async mine(force = false, signal?: AbortSignal): Promise<MyReview | null> {
    try { return parseOwnReview(await read<unknown>('own', '/reviews/me', force, signal)) }
    catch (error) { if (error instanceof ApiClientError && error.status === 404 && error.code === 'WEB_REVIEW_NOT_FOUND') return null; throw error }
  },
  save: (rating: number, content: string, version?: number) => mutate<MyReview>('own', '/reviews/me', 'PUT', { rating, content: content.trim(), ...(version === undefined ? {} : { version }) }),
  remove: () => mutate<void>('own', '/reviews/me', 'DELETE'),
  adminList: (filters: ReviewFilters = {}, cursor?: string, force = false, signal?: AbortSignal) => read<unknown>('admin', `/admin/reviews?${reviewQuery(filters, cursor)}`, force, signal).then(value => parseReviewPage<AdminReview>(value, true)),
  detail: (id: string, force = false, signal?: AbortSignal) => read<AdminReview>('admin', `/admin/reviews/${encodeURIComponent(id)}`, force, signal),
  pending: (force = false, signal?: AbortSignal) => read<{ count: number }>('admin', '/admin/reviews/pending-count', force, signal),
  reply: (id: string, content: string, version: number) => mutate<AdminReview>('admin', `/admin/reviews/${encodeURIComponent(id)}/reply`, 'PUT', { content: content.trim(), version }),
  removeReply: (id: string, version: number) => mutate<void>('admin', `/admin/reviews/${encodeURIComponent(id)}/reply?version=${version}`, 'DELETE'),
}
