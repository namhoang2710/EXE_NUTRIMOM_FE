import assert from 'node:assert/strict'
import test from 'node:test'
import { communityEndpoints } from '../src/features/community/model/community-endpoints.ts'
import { safeCommunityPath } from '../src/features/community/model/community-return-path.ts'
import type { CommunityPost, FeedPage } from '../src/features/community/model/community-types.ts'
import { canLoadMore, FEED_MAX_ITEMS, feedReducer, initialFeedState, optimisticLike } from '../src/features/community/model/feed-state.ts'
import { fitWithin, validateImageFile } from '../src/features/community/model/image-compress.ts'

const post = (id: string, extra: Partial<CommunityPost> = {}) => ({
  id, author: { id: 'a', display_name: 'Lan', avatar_key: null }, content: id, topic: 'OTHER', images: [],
  like_count: 0, comment_count: 0, liked_by_me: false, saved_by_me: false, pinned: false, status: 'APPROVED',
  can_edit: false, can_delete: false, version: 0, published_at: null, created_at: '2026-10-20T00:00:00Z', edited_at: null, ...extra,
}) as CommunityPost
const page = (ids: string[], next: string | null, extra: Partial<FeedPage> = {}): FeedPage =>
  ({ items: ids.map((id) => post(id)), next_cursor: next, has_more: next !== null, ...extra })

test('feed pages append without duplicates and never repeat pinned posts', () => {
  let state = feedReducer(initialFeedState, { type: 'reset', generation: 1 })
  state = feedReducer(state, { type: 'loaded', generation: 1, append: false, page: page(['p', 'a', 'b'], 'c1', { pinned: [post('p', { pinned: true })] }) })
  assert.deepEqual(state.items.map((item) => item.id), ['a', 'b'])
  assert.equal(state.pinned.length, 1)
  assert.equal(canLoadMore(state, false), true)
  assert.equal(canLoadMore(state, true), false, 'a request already in flight blocks another one')

  state = feedReducer(state, { type: 'loadingMore', generation: 1 })
  assert.equal(canLoadMore(state, false), false, 'loadingMore blocks fast scroll from sending the same cursor again')
  state = feedReducer(state, { type: 'loaded', generation: 1, append: true, page: page(['b', 'c'], null) })
  assert.deepEqual(state.items.map((item) => item.id), ['a', 'b', 'c'])
  assert.equal(state.hasMore, false)
  assert.equal(canLoadMore(state, false), false, 'stops at the end of the feed')
})

test('late responses from an old filter are ignored', () => {
  let state = feedReducer(initialFeedState, { type: 'reset', generation: 1 })
  state = feedReducer(state, { type: 'reset', generation: 2 })
  state = feedReducer(state, { type: 'loaded', generation: 1, append: false, page: page(['old'], null) })
  assert.equal(state.items.length, 0)
  state = feedReducer(state, { type: 'failed', generation: 1, append: false, message: 'x', retryAt: 0 })
  assert.equal(state.status, 'loading')
  state = feedReducer(state, { type: 'loaded', generation: 2, append: false, page: page(['new'], null) })
  assert.deepEqual(state.items.map((item) => item.id), ['new'])
})

test('errors keep loaded posts and block auto loading until retry', () => {
  let state = feedReducer(initialFeedState, { type: 'reset', generation: 1 })
  state = feedReducer(state, { type: 'loaded', generation: 1, append: false, page: page(['a'], 'c1') })
  state = feedReducer(state, { type: 'failed', generation: 1, append: true, message: 'Thử lại', retryAt: 5 })
  assert.equal(state.status, 'errorMore')
  assert.equal(state.items.length, 1)
  assert.equal(canLoadMore(state, false), false)
})

test('feed stops loading at the memory cap', () => {
  const ids = Array.from({ length: FEED_MAX_ITEMS }, (_, index) => `p${index}`)
  const state = feedReducer(feedReducer(initialFeedState, { type: 'reset', generation: 1 }), { type: 'loaded', generation: 1, append: false, page: page(ids, 'more') })
  assert.equal(state.hasMore, false)
})

test('patch and remove update both the feed and pinned posts', () => {
  let state = feedReducer(initialFeedState, { type: 'reset', generation: 1 })
  state = feedReducer(state, { type: 'loaded', generation: 1, append: false, page: page(['a'], null, { pinned: [post('p')] }) })
  state = feedReducer(state, { type: 'patch', postId: 'p', patch: { like_count: 3 } })
  assert.equal(state.pinned[0].like_count, 3)
  state = feedReducer(state, { type: 'remove', postId: 'a' })
  assert.equal(state.items.length, 0)
})

test('optimistic like never goes negative and is idempotent', () => {
  assert.deepEqual(optimisticLike({ liked_by_me: false, like_count: 0 }, true), { liked_by_me: true, like_count: 1 })
  assert.deepEqual(optimisticLike({ liked_by_me: true, like_count: 1 }, true), { liked_by_me: true, like_count: 1 })
  assert.deepEqual(optimisticLike({ liked_by_me: true, like_count: 0 }, false), { liked_by_me: false, like_count: 0 })
})

test('community return path only allows the community page with safe parameters', () => {
  const id = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b'
  assert.equal(safeCommunityPath(`/app/community?post=${id}`), `/app/community?post=${id}`)
  assert.equal(safeCommunityPath('/app/community?topic=NUTRITION&x=1'), '/app/community?topic=NUTRITION')
  for (const value of ['//evil.example', 'https://evil.example/app/community', '/app/communityx', '/app/community/../../admin',
    '/app/community?post=<script>', '/app/community#x', 42, undefined]) {
    assert.equal(safeCommunityPath(value), '/app/community', String(value))
  }
})

test('endpoints encode ids and skip empty filters', () => {
  assert.equal(communityEndpoints.feed({}, null, 10), '/community/posts?limit=10')
  assert.equal(communityEndpoints.feed({ topic: 'NUTRITION', hasImages: true, saved: false }, 'abc', 10),
    '/community/posts?cursor=abc&limit=10&topic=NUTRITION&hasImages=true')
  assert.equal(communityEndpoints.like('a/b'), '/community/posts/a%2Fb/like')
})

test('images are validated and scaled down only', () => {
  assert.deepEqual(fitWithin(4096, 2048), { width: 2048, height: 1024 })
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 })
  assert.equal(validateImageFile({ type: 'image/gif', size: 10 }), 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.')
  assert.equal(validateImageFile({ type: 'image/png', size: 11 * 1024 * 1024 }), 'Ảnh vượt quá 10 MB.')
  assert.equal(validateImageFile({ type: 'image/webp', size: 1024 }), null)
})
